/**
 * Dev utility: wipe and recreate all tables. Run with `npm run db:reset`.
 */
import { db } from './index.js';
import { logger } from '../lib/logger.js';

db.exec(`
  DROP TABLE IF EXISTS feed_events;
  DROP TABLE IF EXISTS delegations;
  DROP TABLE IF EXISTS task_results;
  DROP TABLE IF EXISTS agents;
  DROP TABLE IF EXISTS users;
`);

logger.info('database wiped — restart the server to recreate the schema');
process.exit(0);
