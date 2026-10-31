/**
 * Brightloop SMS — Worker entry point
 *
 * Starts the email and PDF background workers. Each worker polls its
 * respective queue / database table independently so they can be scaled
 * or restarted without affecting one another.
 */

import 'dotenv/config';
import { createLogger, format, transports } from 'winston';
import { startEmailWorker } from './email.worker';
import { startPdfWorker } from './pdf.worker';

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [new transports.Console()],
});

async function bootstrap(): Promise<void> {
  logger.info('Brightloop Worker starting…');

  try {
    await startEmailWorker(logger);
    logger.info('Email worker started');
  } catch (err) {
    logger.error('Failed to start email worker', { err });
    process.exit(1);
  }

  try {
    await startPdfWorker(logger);
    logger.info('PDF worker started');
  } catch (err) {
    logger.error('Failed to start PDF worker', { err });
    process.exit(1);
  }

  logger.info('All workers running');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully…`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Unhandled bootstrap error', err);
  process.exit(1);
});
