/**
 * Brightloop SMS — Database Seeder
 *
 * Creates deterministic reference data for development / staging:
 *
 *   Users
 *   ─────
 *   • 1 ADMIN  — admin@brightloop.com / Admin@12345
 *   • 2 STAFF  — staff1@brightloop.com / Staff@12345
 *                staff2@brightloop.com / Staff@12345
 *   • 3 CUSTOMER users with associated Customer records
 *
 *   Products / Variants / Plans / Tax / Discount
 *   ─────────────────────────────────────────────
 *   • 5 SaaS products
 *   • 3 product variants (1 Odoo brand variant with +560 price adj.)
 *   • 3 plans  (MONTHLY, YEARLY, WEEKLY)
 *   • 2 tax rules  (18 % GST exclusive, 5 % inclusive)
 *   • 2 discount rules
 *
 *   Sample Business Data
 *   ────────────────────
 *   • Sample quotations and subscriptions
 *
 * Passwords are hashed with argon2id.  Transactions are used to ensure
 * atomicity; existing records are upserted where possible so the seed
 * can be run multiple times safely.
 */

import { PrismaClient, UserRole, UserStatus, BillingInterval, ProductType, ProductStatus, PlanStatus, TaxType, DiscountType, QuotationStatus, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── Main seed ───────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding Brightloop SMS database…');

  // ── 1. ADMIN user ──────────────────────────────────────────────────────────
  const adminHash = await hashPassword('Admin@12345');
  const admin = await prisma.user.upsert({
    where: { emailNormalized: 'admin@brightloop.com' },
    update: {},
    create: {
      email: 'admin@brightloop.com',
      emailNormalized: 'admin@brightloop.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+1-555-000-0001',
    },
  });
  console.log(`  ✓ Admin:    ${admin.email}`);

  // ── 2. STAFF users ─────────────────────────────────────────────────────────
  const staffHash = await hashPassword('Staff@12345');
  const staff1 = await prisma.user.upsert({
    where: { emailNormalized: 'staff1@brightloop.com' },
    update: {},
    create: {
      email: 'staff1@brightloop.com',
      emailNormalized: 'staff1@brightloop.com',
      passwordHash: staffHash,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      firstName: 'Alice',
      lastName: 'Nguyen',
      phone: '+1-555-000-0002',
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { emailNormalized: 'staff2@brightloop.com' },
    update: {},
    create: {
      email: 'staff2@brightloop.com',
      emailNormalized: 'staff2@brightloop.com',
      passwordHash: staffHash,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      firstName: 'Bob',
      lastName: 'Patel',
      phone: '+1-555-000-0003',
    },
  });
  console.log(`  ✓ Staff:    ${staff1.email}, ${staff2.email}`);

  // ── 3. CUSTOMER users + Customer records ───────────────────────────────────
  const customerHash = await hashPassword('Customer@12345');

  const customerDefs = [
    {
      email: 'acme@example.com',
      firstName: 'John',
      lastName: 'Smith',
      company: 'Acme Corp',
      vat: 'US123456789',
    },
    {
      email: 'globex@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      company: 'Globex Inc',
      vat: 'US987654321',
    },
    {
      email: 'initech@example.com',
      firstName: 'Michael',
      lastName: 'Bolton',
      company: 'Initech LLC',
      vat: null,
    },
  ];

  const customers: Awaited<ReturnType<typeof prisma.customer.upsert>>[] = [];

  for (const def of customerDefs) {
    const user = await prisma.user.upsert({
      where: { emailNormalized: def.email },
      update: {},
      create: {
        email: def.email,
        emailNormalized: def.email,
        passwordHash: customerHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        firstName: def.firstName,
        lastName: def.lastName,
      },
    });

    const customer = await prisma.customer.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyName: def.company,
        vatNumber: def.vat ?? undefined,
        currency: 'USD',
        billingAddress: {
          line1: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          country: 'US',
        },
      },
    });
    customers.push(customer);
  }
  console.log(`  ✓ Customers: ${customerDefs.map((d) => d.email).join(', ')}`);

  // ── 4. Products ────────────────────────────────────────────────────────────
  const productDefs = [
    { name: 'Brightloop Core', salesPrice: 299, costPrice: 50 },
    { name: 'Brightloop Pro',  salesPrice: 599, costPrice: 100 },
    { name: 'Brightloop Enterprise', salesPrice: 1299, costPrice: 200 },
    { name: 'Odoo Integration Add-on', salesPrice: 199, costPrice: 30 },
    { name: 'Priority Support Pack', salesPrice: 149, costPrice: 20 },
  ];

  const products: Awaited<ReturnType<typeof prisma.product.upsert>>[] = [];
  for (const def of productDefs) {
    const product = await prisma.product.upsert({
      where: { id: `seed-product-${def.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-product-${def.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: def.name,
        type: ProductType.SUBSCRIPTION,
        description: `${def.name} — SaaS subscription product`,
        salesPrice: def.salesPrice,
        costPrice: def.costPrice,
        currency: 'USD',
        status: ProductStatus.ACTIVE,
      },
    });
    products.push(product);
  }
  console.log(`  ✓ Products: ${products.length} created`);

  // ── 5. Product Variants ────────────────────────────────────────────────────
  // Three variants for the Odoo Integration Add-on (products[3])
  const variantDefs = [
    {
      productId: products[3].id,
      name: 'Standard Edition',
      priceAdjustment: 0,
      sku: 'ODOO-STD',
    },
    {
      productId: products[3].id,
      name: 'Odoo Brand Variant',
      priceAdjustment: 560,
      sku: 'ODOO-BRAND',
    },
    {
      productId: products[1].id,
      name: 'Annual Pre-pay Variant',
      priceAdjustment: -60,
      sku: 'PRO-ANN',
    },
  ];

  const variants: Awaited<ReturnType<typeof prisma.productVariant.upsert>>[] = [];
  for (const def of variantDefs) {
    const variant = await prisma.productVariant.upsert({
      where: { id: `seed-variant-${def.sku}` },
      update: {},
      create: {
        id: `seed-variant-${def.sku}`,
        productId: def.productId,
        name: def.name,
        sku: def.sku,
        priceAdjustment: def.priceAdjustment,
        isActive: true,
      },
    });
    variants.push(variant);
  }
  console.log(`  ✓ Variants: ${variants.length} created`);

  // ── 6. Plans ───────────────────────────────────────────────────────────────
  const planDefs = [
    {
      id: 'seed-plan-monthly',
      name: 'Monthly Subscription',
      billingInterval: BillingInterval.MONTHLY,
      intervalCount: 1,
    },
    {
      id: 'seed-plan-yearly',
      name: 'Annual Subscription',
      billingInterval: BillingInterval.YEARLY,
      intervalCount: 1,
    },
    {
      id: 'seed-plan-weekly',
      name: 'Weekly Subscription',
      billingInterval: BillingInterval.WEEKLY,
      intervalCount: 1,
    },
  ];

  const plans: Awaited<ReturnType<typeof prisma.plan.upsert>>[] = [];
  for (const def of planDefs) {
    const plan = await prisma.plan.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        name: def.name,
        billingInterval: def.billingInterval,
        intervalCount: def.intervalCount,
        currency: 'USD',
        status: PlanStatus.ACTIVE,
        allowPause: true,
        allowRenewal: true,
        allowEarlyClosure: true,
      },
    });
    plans.push(plan);
  }
  console.log(`  ✓ Plans: ${plans.length} created`);

  // Link products to plans
  for (const plan of plans) {
    for (let i = 0; i < Math.min(3, products.length); i++) {
      await prisma.planProduct.upsert({
        where: { planId_productId: { planId: plan.id, productId: products[i].id } },
        update: {},
        create: {
          planId: plan.id,
          productId: products[i].id,
          unitPrice: products[i].salesPrice,
          minQty: 1,
          sortOrder: i,
        },
      });
    }
  }
  console.log(`  ✓ Plan–product links created`);

  // ── 7. Tax Rules ───────────────────────────────────────────────────────────
  const gstRule = await prisma.taxRule.upsert({
    where: { code: 'GST-18-EX' },
    update: {},
    create: {
      name: 'GST 18% (Exclusive)',
      code: 'GST-18-EX',
      rate: 18,
      type: TaxType.EXCLUSIVE,
      description: 'Goods and Services Tax — 18% added on top of the price',
      jurisdiction: 'IN',
      isActive: true,
    },
  });

  const vatRule = await prisma.taxRule.upsert({
    where: { code: 'VAT-5-INC' },
    update: {},
    create: {
      name: 'VAT 5% (Inclusive)',
      code: 'VAT-5-INC',
      rate: 5,
      type: TaxType.INCLUSIVE,
      description: 'Value Added Tax — 5% already included in the price',
      jurisdiction: 'EU',
      isActive: true,
    },
  });
  console.log(`  ✓ Tax rules: GST-18-EX, VAT-5-INC`);

  // ── 8. Discount Rules ──────────────────────────────────────────────────────
  await prisma.discountRule.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      name: 'Welcome 10% Off',
      code: 'WELCOME10',
      type: DiscountType.PERCENTAGE,
      value: 10,
      isSubscriptionWide: true,
      isActive: true,
      maxUsage: 500,
      startDate: new Date('2024-01-01'),
    },
  });

  await prisma.discountRule.upsert({
    where: { code: 'FLAT50' },
    update: {},
    create: {
      name: 'Flat $50 Off',
      code: 'FLAT50',
      type: DiscountType.FIXED_AMOUNT,
      value: 50,
      minPurchaseAmount: 300,
      isSubscriptionWide: false,
      isActive: true,
      maxUsage: 200,
      startDate: new Date('2024-01-01'),
    },
  });
  console.log(`  ✓ Discount rules: WELCOME10, FLAT50`);

  // ── 9. Sample Quotations ───────────────────────────────────────────────────
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.upsert({
      where: { number: 'QUO-2024-0001' },
      update: {},
      create: {
        number: 'QUO-2024-0001',
        customerId: customers[0].id,
        status: QuotationStatus.ACCEPTED,
        validFrom: now,
        validTo: addDays(now, 30),
        currency: 'USD',
        paymentTerms: 'Net 30',
        subtotal: 299,
        taxTotal: 53.82,
        discountTotal: 29.9,
        total: 322.92,
        acceptedAt: now,
        lines: {
          create: [
            {
              productId: products[0].id,
              description: 'Brightloop Core — Monthly',
              quantity: 1,
              unitPrice: 299,
              discountAmount: 29.9,
              subtotal: 269.1,
              taxAmount: 53.82,
              total: 322.92,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Second quotation — DRAFT
    await tx.quotation.upsert({
      where: { number: 'QUO-2024-0002' },
      update: {},
      create: {
        number: 'QUO-2024-0002',
        customerId: customers[1].id,
        status: QuotationStatus.DRAFT,
        validFrom: now,
        validTo: addDays(now, 30),
        currency: 'USD',
        subtotal: 599,
        taxTotal: 0,
        discountTotal: 0,
        total: 599,
        lines: {
          create: [
            {
              productId: products[1].id,
              description: 'Brightloop Pro — Monthly',
              quantity: 1,
              unitPrice: 599,
              discountAmount: 0,
              subtotal: 599,
              taxAmount: 0,
              total: 599,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    return quotation;
  });
  console.log(`  ✓ Sample quotations created`);

  // ── 10. Sample Subscriptions ───────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    const subStart = addDays(now, -60);
    const nextBill = addMonths(subStart, 3);

    // Active subscription for customer 0
    await tx.subscription.upsert({
      where: { number: 'SUB-2024-0001' },
      update: {},
      create: {
        number: 'SUB-2024-0001',
        customerId: customers[0].id,
        planId: plans[0].id,  // MONTHLY
        status: SubscriptionStatus.ACTIVE,
        startDate: subStart,
        nextBillingDate: nextBill,
        currency: 'USD',
        lines: {
          create: [
            {
              productId: products[0].id,
              description: 'Brightloop Core',
              quantity: 1,
              unitPrice: 299,
              currency: 'USD',
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Paused subscription for customer 1
    await tx.subscription.upsert({
      where: { number: 'SUB-2024-0002' },
      update: {},
      create: {
        number: 'SUB-2024-0002',
        customerId: customers[1].id,
        planId: plans[1].id,  // YEARLY
        status: SubscriptionStatus.PAUSED,
        startDate: addDays(now, -90),
        pausedAt: addDays(now, -10),
        currency: 'USD',
        lines: {
          create: [
            {
              productId: products[1].id,
              description: 'Brightloop Pro',
              quantity: 1,
              unitPrice: 599,
              currency: 'USD',
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Closed subscription for customer 2
    await tx.subscription.upsert({
      where: { number: 'SUB-2024-0003' },
      update: {},
      create: {
        number: 'SUB-2024-0003',
        customerId: customers[2].id,
        planId: plans[0].id,  // MONTHLY
        status: SubscriptionStatus.CLOSED,
        startDate: addDays(now, -120),
        endDate: addDays(now, -5),
        closedAt: addDays(now, -5),
        currency: 'USD',
        lines: {
          create: [
            {
              productId: products[4].id,
              description: 'Priority Support Pack',
              quantity: 2,
              unitPrice: 149,
              currency: 'USD',
              sortOrder: 0,
            },
          ],
        },
      },
    });
  });
  console.log(`  ✓ Sample subscriptions created`);

  console.log('\n🌱  Seed complete.\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
