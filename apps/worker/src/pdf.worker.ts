/**
 * Brightloop SMS — PDF Worker
 *
 * Polls for Invoice records where:
 *   - status  = CONFIRMED
 *   - pdfGeneratedAt IS NULL
 *
 * For each such invoice it:
 *   1. Generates a PDF using pdfkit (invoice number, customer info,
 *      line items, subtotal, tax, total).
 *   2. Uploads the PDF to S3 / MinIO under
 *      invoices/<year>/<invoiceNumber>.pdf
 *   3. Saves the resulting pdfPath and pdfGeneratedAt back to the
 *      Invoice record.
 *
 * Poll interval: 60 s (configurable via PDF_POLL_INTERVAL_MS env var).
 */

import { PrismaClient, Invoice, InvoiceLine } from '@prisma/client';
import { Logger } from 'winston';
import PDFDocument from 'pdfkit';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// ─── Constants ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = Number(process.env.PDF_POLL_INTERVAL_MS ?? 60_000);
const BATCH_SIZE = 10;

// ─── S3 client ───────────────────────────────────────────────────────────────

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT, // MinIO endpoint if set
    forcePathStyle: !!process.env.STORAGE_ENDPOINT, // required for MinIO
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? '',
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? '',
    },
  });
}

// ─── PDF generation ──────────────────────────────────────────────────────────

type InvoiceWithDetails = Invoice & {
  lines: InvoiceLine[];
  customer: {
    companyName: string | null;
    user: { firstName: string; lastName: string; email: string };
    billingAddress: unknown;
  };
};

async function generatePdfBuffer(invoice: InvoiceWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const customer = invoice.customer;
    const customerName =
      customer.companyName ??
      `${customer.user.firstName} ${customer.user.lastName}`;
    const billingAddress =
      (customer.billingAddress as Record<string, string> | null) ?? {};

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .moveDown(0.5)
      .text('Brightloop', { align: 'right' })
      .text('brightloop.com', { align: 'right' });

    doc.moveDown(1);

    // ── Invoice meta ─────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Invoice #: `, { continued: true })
      .font('Helvetica')
      .text(invoice.number);

    doc
      .font('Helvetica-Bold')
      .text('Invoice Date: ', { continued: true })
      .font('Helvetica')
      .text(invoice.invoiceDate.toISOString().slice(0, 10));

    doc
      .font('Helvetica-Bold')
      .text('Due Date: ', { continued: true })
      .font('Helvetica')
      .text(invoice.dueDate.toISOString().slice(0, 10));

    doc.moveDown(1);

    // ── Bill-to ──────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:');
    doc.font('Helvetica').text(customerName);
    if (billingAddress.line1) doc.text(billingAddress.line1);
    if (billingAddress.line2) doc.text(billingAddress.line2);
    if (billingAddress.city || billingAddress.state) {
      doc.text(
        [billingAddress.city, billingAddress.state, billingAddress.zip]
          .filter(Boolean)
          .join(', '),
      );
    }
    if (billingAddress.country) doc.text(billingAddress.country);
    doc.text(customer.user.email);

    doc.moveDown(1);

    // ── Line items table ─────────────────────────────────────────────────────
    const tableTop = doc.y;
    const col = { desc: 50, qty: 310, price: 380, disc: 450, total: 510 };

    // Table header
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#4f46e5');

    doc.text('Description', col.desc, tableTop);
    doc.text('Qty', col.qty, tableTop, { width: 60, align: 'right' });
    doc.text('Unit Price', col.price, tableTop, { width: 60, align: 'right' });
    doc.text('Discount', col.disc, tableTop, { width: 50, align: 'right' });
    doc.text('Total', col.total, tableTop, { width: 60, align: 'right' });

    doc
      .moveTo(50, doc.y + 4)
      .lineTo(560, doc.y + 4)
      .strokeColor('#4f46e5')
      .stroke();

    doc.fillColor('#000000').font('Helvetica').fontSize(9);

    let y = doc.y + 8;
    for (const line of invoice.lines) {
      const lineTotal = Number(line.total);
      doc.text(line.description, col.desc, y, { width: 250 });
      doc.text(Number(line.quantity).toFixed(2), col.qty, y, { width: 60, align: 'right' });
      doc.text(Number(line.unitPrice).toFixed(2), col.price, y, { width: 60, align: 'right' });
      doc.text(Number(line.discountAmount).toFixed(2), col.disc, y, { width: 50, align: 'right' });
      doc.text(lineTotal.toFixed(2), col.total, y, { width: 60, align: 'right' });
      y += 20;
    }

    doc.moveTo(50, y).lineTo(560, y).strokeColor('#d1d5db').stroke();
    y += 8;

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalsLeft = 390;
    const totalsRight = 510;

    const addTotalRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, totalsLeft, y, { width: 110, align: 'right' })
        .text(value, totalsRight, y, { width: 60, align: 'right' });
      y += 18;
    };

    addTotalRow('Subtotal:', `${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}`);
    if (Number(invoice.discountTotal) > 0) {
      addTotalRow(
        'Discount:',
        `-${invoice.currency} ${Number(invoice.discountTotal).toFixed(2)}`,
      );
    }
    if (Number(invoice.taxTotal) > 0) {
      addTotalRow('Tax:', `${invoice.currency} ${Number(invoice.taxTotal).toFixed(2)}`);
    }
    addTotalRow(
      'Total:',
      `${invoice.currency} ${Number(invoice.total).toFixed(2)}`,
      true,
    );
    addTotalRow(
      'Amount Paid:',
      `${invoice.currency} ${Number(invoice.amountPaid).toFixed(2)}`,
    );
    addTotalRow(
      'Balance Due:',
      `${invoice.currency} ${Number(invoice.amountDue).toFixed(2)}`,
      true,
    );

    // ── Footer ───────────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(
        'Thank you for your business.',
        50,
        750,
        { align: 'center', width: 510 },
      );

    doc.end();
  });
}

// ─── S3 upload ───────────────────────────────────────────────────────────────

async function uploadToS3(
  s3: S3Client,
  buffer: Buffer,
  key: string,
): Promise<string> {
  const bucket = process.env.STORAGE_BUCKET ?? 'brightloop-invoices';

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentLength: buffer.length,
    }),
  );

  // Return a relative path (stored in DB); presigned URLs are generated on demand
  return key;
}

// ─── Worker ──────────────────────────────────────────────────────────────────

async function poll(
  s3: S3Client,
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: 'CONFIRMED',
      pdfGeneratedAt: null,
    },
    include: {
      lines: true,
      customer: {
        include: { user: true },
      },
    },
    orderBy: { invoiceDate: 'asc' },
    take: BATCH_SIZE,
  });

  if (invoices.length === 0) return;

  logger.info(`PDF worker: generating PDFs for ${invoices.length} invoice(s)`);

  for (const invoice of invoices) {
    try {
      const pdfBuffer = await generatePdfBuffer(invoice as InvoiceWithDetails);

      const year = invoice.invoiceDate.getFullYear();
      const key = `invoices/${year}/${invoice.number}.pdf`;

      const pdfPath = await uploadToS3(s3, pdfBuffer, key);

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          pdfPath,
          pdfGeneratedAt: new Date(),
        },
      });

      logger.info(`PDF worker: generated and uploaded ${key} for invoice ${invoice.number}`);
    } catch (err) {
      logger.error(`PDF worker: failed to generate PDF for invoice ${invoice.id}`, {
        err: err instanceof Error ? err.message : String(err),
      });
      // We do NOT mark the invoice failed here; it will be retried on the next poll.
    }
  }
}

// ─── Exported start function ─────────────────────────────────────────────────

export async function startPdfWorker(logger: Logger): Promise<void> {
  const prisma = new PrismaClient();
  const s3 = createS3Client();

  const tick = async () => {
    try {
      await poll(s3, prisma, logger);
    } catch (err) {
      logger.error('PDF worker: poll error', { err });
    } finally {
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  await tick();
}
