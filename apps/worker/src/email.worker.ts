/**
 * Brightloop SMS — Email Worker
 *
 * Polls NotificationOutbox every 30 s for PENDING entries and sends
 * emails via nodemailer for the following types:
 *   - PASSWORD_RESET
 *   - INVOICE_READY
 *
 * After processing, marks records as PROCESSED or FAILED with an
 * errorMsg.  Respects the maxAttempts limit; entries that exceed it
 * are permanently marked FAILED.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

// ─── Constants ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;
const BATCH_SIZE = 20;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PasswordResetPayload {
  toEmail: string;
  toName: string;
  resetLink: string;
  expiresInMinutes: number;
}

interface InvoiceReadyPayload {
  toEmail: string;
  toName: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  currency: string;
  dueDate: string;
  pdfPath?: string;
  downloadUrl?: string;
}

type NotificationPayload = PasswordResetPayload | InvoiceReadyPayload;

// ─── Mailer factory ──────────────────────────────────────────────────────────

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? '',
          }
        : undefined,
  });
}

// ─── Email builders ──────────────────────────────────────────────────────────

function buildPasswordResetEmail(payload: PasswordResetPayload) {
  return {
    from: process.env.EMAIL_FROM ?? 'Brightloop <no-reply@brightloop.com>',
    to: payload.toEmail,
    subject: 'Reset your Brightloop password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Password Reset Request</h2>
        <p>Hi ${payload.toName},</p>
        <p>We received a request to reset your Brightloop password.
           Click the button below to choose a new password.
           This link expires in <strong>${payload.expiresInMinutes} minutes</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${payload.resetLink}"
             style="background:#4f46e5;color:#fff;padding:12px 28px;
                    border-radius:6px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p>If you did not request a password reset you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:12px">
          © ${new Date().getFullYear()} Brightloop. All rights reserved.
        </p>
      </div>`,
    text: `Hi ${payload.toName},\n\nReset your password here: ${payload.resetLink}\n\nThis link expires in ${payload.expiresInMinutes} minutes.\n\nIf you did not request this, ignore this email.`,
  };
}

function buildInvoiceReadyEmail(payload: InvoiceReadyPayload) {
  const actionUrl = payload.downloadUrl ?? `${process.env.APP_URL}/invoices`;
  return {
    from: process.env.EMAIL_FROM ?? 'Brightloop <no-reply@brightloop.com>',
    to: payload.toEmail,
    subject: `Invoice ${payload.invoiceNumber} from Brightloop`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Invoice ${payload.invoiceNumber}</h2>
        <p>Hi ${payload.toName},</p>
        <p>Your invoice <strong>${payload.invoiceNumber}</strong> dated
           ${payload.invoiceDate} is ready.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb">Invoice Number</td>
            <td style="padding:8px;border:1px solid #e5e7eb"><strong>${payload.invoiceNumber}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb">Amount Due</td>
            <td style="padding:8px;border:1px solid #e5e7eb"><strong>${payload.currency} ${payload.total.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb">Due Date</td>
            <td style="padding:8px;border:1px solid #e5e7eb">${payload.dueDate}</td>
          </tr>
        </table>
        <p style="text-align:center;margin:32px 0">
          <a href="${actionUrl}"
             style="background:#4f46e5;color:#fff;padding:12px 28px;
                    border-radius:6px;text-decoration:none;font-weight:600">
            View Invoice
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px">
          © ${new Date().getFullYear()} Brightloop. All rights reserved.
        </p>
      </div>`,
    text: `Hi ${payload.toName},\n\nYour invoice ${payload.invoiceNumber} for ${payload.currency} ${payload.total.toFixed(2)} is due on ${payload.dueDate}.\n\nView it here: ${actionUrl}`,
  };
}

// ─── Worker ──────────────────────────────────────────────────────────────────

async function processNotification(
  record: { id: string; type: string; payload: unknown; attempts: number; maxAttempts: number },
  transporter: Transporter,
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  const payload = record.payload as NotificationPayload;
  let mailOptions: ReturnType<typeof buildPasswordResetEmail>;

  switch (record.type) {
    case 'PASSWORD_RESET':
      mailOptions = buildPasswordResetEmail(payload as PasswordResetPayload);
      break;
    case 'INVOICE_READY':
      mailOptions = buildInvoiceReadyEmail(payload as InvoiceReadyPayload);
      break;
    default:
      throw new Error(`Unknown notification type: ${record.type}`);
  }

  await transporter.sendMail(mailOptions);

  await prisma.notificationOutbox.update({
    where: { id: record.id },
    data: {
      status: 'PROCESSED',
      processedAt: new Date(),
      attempts: record.attempts + 1,
    },
  });
}

async function poll(
  transporter: Transporter,
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  const pending = await prisma.notificationOutbox.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (pending.length === 0) return;

  logger.info(`Email worker: processing ${pending.length} notification(s)`);

  for (const record of pending) {
    // Check attempt cap
    if (record.attempts >= record.maxAttempts) {
      await prisma.notificationOutbox.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMsg: 'Exceeded maxAttempts without successful delivery',
        },
      });
      logger.warn(`Email worker: permanently failed ${record.id} (maxAttempts reached)`);
      continue;
    }

    // Mark in-flight to prevent concurrent pickup
    await prisma.notificationOutbox.update({
      where: { id: record.id },
      data: { status: 'PROCESSING', attempts: record.attempts + 1 },
    });

    try {
      await processNotification(
        { ...record, attempts: record.attempts + 1 },
        transporter,
        prisma,
        logger,
      );
      logger.info(`Email worker: sent ${record.type} for record ${record.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = record.attempts + 1;
      const exhausted = newAttempts >= record.maxAttempts;

      await prisma.notificationOutbox.update({
        where: { id: record.id },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          attempts: newAttempts,
          errorMsg,
          ...(exhausted ? { failedAt: new Date() } : {}),
        },
      });

      logger.error(`Email worker: failed to process ${record.id}`, {
        err: errorMsg,
        attempts: newAttempts,
        exhausted,
      });
    }
  }
}

// ─── Exported start function ─────────────────────────────────────────────────

export async function startEmailWorker(logger: Logger): Promise<void> {
  const prisma = new PrismaClient();
  const transporter = createTransporter();

  // Verify SMTP connection on startup
  try {
    await transporter.verify();
    logger.info('Email worker: SMTP connection verified');
  } catch (err) {
    logger.warn('Email worker: SMTP verification failed (will retry on send)', { err });
  }

  const tick = async () => {
    try {
      await poll(transporter, prisma, logger);
    } catch (err) {
      logger.error('Email worker: poll error', { err });
    } finally {
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  // Start immediately, then repeat
  await tick();
}
