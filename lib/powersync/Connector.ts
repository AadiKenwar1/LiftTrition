import { supabase } from '@/lib/supabase/client';
import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/react-native';
import * as Sentry from '@sentry/react-native';

// Postgres SQLSTATE classes 22 (data exception) and 23 (integrity constraint violation) are
// permanent rejections - retrying the same op will never succeed, so these are dead-lettered
// instead of blocking the rest of the upload queue forever.
function isNonRetryableUploadError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && /^2[23]/.test(code);
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
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
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
        if (isNonRetryableUploadError(error)) {
          Sentry.captureException(error, { extra: { table: op.table, opType: op.op, opId: op.id } });
          continue;
        }
        throw error;
      }
    }

    // Mark transaction as complete
    await transaction.complete();
  }

  private async createRecord(table: string, record: any) {
    // Handle tables with unique constraints on non-primary-key columns
    // These tables need special handling because PowerSync generates new IDs
    // but Supabase has unique constraints on other columns
    
    if (table === 'settings' && record.user_id) {
      // Settings has UNIQUE constraint on user_id
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', record.user_id)
        .single();
      
      if (existing) {
        // Update existing record (ignore the new id from PowerSync, use existing id)
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq('user_id', record.user_id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from(table)
          .insert(record);
        
        if (error) throw error;
      }
    } else if (table === 'weight_progress' && record.user_id && record.date) {
      // Weight progress has UNIQUE constraint on (user_id, date)
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', record.user_id)
        .eq('date', record.date)
        .single();
      
      if (existing) {
        // Update existing record
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq('user_id', record.user_id)
          .eq('date', record.date);
        
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
