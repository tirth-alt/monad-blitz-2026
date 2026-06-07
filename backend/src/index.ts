import { createApp } from './app.js';
import { aiEnabled, env } from './config/env.js';
import { closeDb } from './db/index.js';
import { logger } from './lib/logger.js';
import { startChainListener, stopChainListener } from './services/chain/listener.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      ai: aiEnabled ? env.GROQ_MODEL : 'mock-mode',
    },
    `🧠 ChainMind backend listening on http://localhost:${env.PORT}`,
  );

  // Start watching on-chain events (no-op for contracts without an address).
  startChainListener();
});

// Graceful shutdown so SQLite/WAL and the chain listener close cleanly.
function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  stopChainListener();
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Force-exit if something hangs.
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
