import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'powersync.db'
  }
});

export default powerSync;
