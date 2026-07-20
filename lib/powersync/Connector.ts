import { ENV } from '@/lib/env';
import { supabase } from '@/lib/supabase/client';
import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/react-native';
import * as Sentry from '@sentry/react-native';

// Natural-key UNIQUE constraints per table (columns other than the primary key `id`).
// These tables use check-then-insert (select existing -> update, else insert) because PowerSync
// mints a fresh id per device, so a primary-key upsert can't resolve a same-natural-key collision.
// Two devices racing can both pass the check; the loser gets a 23505 that heals itself on retry
// (the retry takes the "existing -> update" branch), so on these tables 23505 must stay retryable.
// SELF_HEALING_CONFLICT_TABLES is DERIVED from this map so a natural-key table can never be added
// to the conflict branch without also being made self-healing (and vice versa) - the drift that
// left user_exercises silently dropping cross-device duplicate-named custom exercises.
const CONFLICT_KEYS: Record<string, string[]> = {
  settings: ['user_id'],
  weight_progress: ['user_id', 'date'],
  user_exercises: ['user_id', 'name'],
};
const SELF_HEALING_CONFLICT_TABLES = new Set(Object.keys(CONFLICT_KEYS));

// Classify a Supabase upload rejection as permanently non-retryable (dead-letter) vs transient (retry).
// Permanent: SQLSTATE classes 22 (data exception), 23 (integrity constraint) and 42 (access rule /
// undefined table / undefined column - RLS denial + schema drift), plus PostgREST schema-cache
// misses PGRST204/PGRST205. Everything else must keep re-throwing so PowerSync retries: JWT-expired
// (PGRST301), connection/serialization/resource classes 08/40/53/57/58, and codeless network errors
// (non-string code). Dead-lettering permanent errors stops one poison row from wedging the entire
// upload queue forever (which times out sign-out and forces total-queue data loss).
function isNonRetryableUploadError(error: unknown, table: string): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code !== 'string') {
    return false;
  }
  const isPermanent = /^(22|23|42)/.test(code) || code === 'PGRST204' || code === 'PGRST205';
  if (!isPermanent) {
    return false;
  }
  if (code === '23505' && SELF_HEALING_CONFLICT_TABLES.has(table)) {
    return false;
  }
  return true;
}

export class Connector implements PowerSyncBackendConnector {
  /**
   * Fetch credentials from Supabase to authenticate with PowerSync
   */
  async fetchCredentials() {
    const session = await supabase.auth.getSession();

    if (!session.data.session) {
      throw new Error('No Supabase session found');
    }

    return {
      endpoint: ENV.POWERSYNC_URL!,
      token: session.data.session.access_token
    };
  }

  /**
   * Convert JSON string array to JavaScript array
   * Supabase's JavaScript client accepts JavaScript arrays and converts them to PostgreSQL arrays automatically
   */
  private convertJsonArrayToPostgresArray(value: any): any {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // Return as JavaScript array - Supabase will convert to PostgreSQL array
          return parsed;
        }
      } catch (e) {
        // If parsing fails, return as is
      }
    }
    return value;
  }

  /**
   * Prepare record for Supabase by converting JSON arrays to PostgreSQL arrays
   */
  private prepareRecordForSupabase(table: string, record: any): any {
    const prepared = { ...record };
    
    // Convert accessory_muscles from JSON string to PostgreSQL array format
    if (table === 'user_exercises' && prepared.accessory_muscles !== undefined) {
      prepared.accessory_muscles = this.convertJsonArrayToPostgresArray(prepared.accessory_muscles);
    }
    
    return prepared;
  }

  /**
   * Upload local changes to Supabase backend
   * This is called automatically by PowerSync when there are pending writes
   */
  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    // Process each operation in the transaction
    for (const op of transaction.crud) {
      const record = { ...op.opData, id: op.id };
      // Prepare record for Supabase (convert JSON arrays to PostgreSQL arrays)
      const preparedRecord = this.prepareRecordForSupabase(op.table, record);
      
      try {
        switch (op.op) {
          case UpdateType.PUT:
            // Create new record in Supabase
            await this.createRecord(op.table, preparedRecord);
            break;
          case UpdateType.PATCH:
            // Update existing record in Supabase
            await this.updateRecord(op.table, preparedRecord);
            break;
          case UpdateType.DELETE:
            // Delete record from Supabase
            await this.deleteRecord(op.table, op.id);
            break;
        }
      } catch (error) {
        if (isNonRetryableUploadError(error, op.table)) {
          Sentry.captureException(error, {
            tags: { area: 'powersync-dead-letter' },
            extra: { table: op.table, opType: op.op, opId: op.id }
          });
          continue;
        }
        throw error;
      }
    }

    // Mark transaction as complete
    await transaction.complete();
  }

  // Create a record in Supabase, resolving natural-key conflicts (CONFLICT_KEYS) before the generic PK upsert.
  private async createRecord(table: string, record: any) {
    // Tables with a natural-key UNIQUE constraint can't rely on a primary-key upsert: PowerSync
    // mints a fresh id per device, so two devices creating the "same" row produce different ids.
    // Select the existing row by its natural key, then update it (discarding the local id) if it
    // exists, else insert. Every other table uses the generic PK upsert below. Driven by
    // CONFLICT_KEYS so settings, weight_progress, and user_exercises share one code path.
    const conflictKeys = CONFLICT_KEYS[table];
    if (conflictKeys && conflictKeys.every((key) => record[key])) {
      // Chain one .eq() filter per conflict-key column onto a query builder.
      const filterByConflictKeys = (query: any) => conflictKeys.reduce((q, key) => q.eq(key, record[key]), query);

      const { data: existing } = await filterByConflictKeys(supabase.from(table).select('id')).single();

      if (existing) {
        // Update existing record (ignore the new id from PowerSync, use the existing row's id)
        const { id, ...updateData } = record;
        const { error } = await filterByConflictKeys(supabase.from(table).update(updateData));

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from(table)
          .insert(record);

        if (error) throw error;
      }
    } else {
      // For other tables, use standard upsert (conflicts on primary key)
      const { error } = await supabase
        .from(table)
        .upsert(record);

      if (error) throw error;
    }
  }

  private async updateRecord(table: string, record: any) {
    const { id, ...updateData } = record;
    
    // Special handling for settings table (has unique constraint on user_id)
    // PATCH operations don't include user_id, so we need to look it up first
    if (table === 'settings') {
      // First try to find by id
      const existingById = await supabase
        .from(table)
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
      
      let user_id: string | undefined;
      
      if (existingById.data?.user_id) {
        user_id = existingById.data.user_id;
      } else {
        // If not found by id, try to get user_id from session and look up by user_id
        // This handles the case where the record was created locally in PowerSync
        // but doesn't exist in Supabase yet (or has a different id)
        const session = await supabase.auth.getSession();
        if (session.data.session?.user?.id) {
          const userSettings = await supabase
            .from(table)
            .select('user_id')
            .eq('user_id', session.data.session.user.id)
            .maybeSingle();
          
          if (userSettings.data?.user_id) {
            user_id = userSettings.data.user_id;
          } else {
            return;
          }
        } else {
          throw new Error(`Settings record ${id} not found and no user session available`);
        }
      }
      
      if (!user_id) {
        throw new Error(`Settings record ${id} not found: Missing user_id`);
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('user_id', user_id);
      
      if (error) throw error;
      return;
    }
    
    // For other tables, update by id
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  }

  private async deleteRecord(table: string, id: string) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
