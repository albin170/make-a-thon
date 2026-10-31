import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { PlansModule } from './plans/plans.module';
import { QuotationsModule } from './quotations/quotations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TaxModule } from './common/tax/tax.module';
import { DiscountsModule } from './common/discounts/discounts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60') * 1000,
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    PlansModule,
    QuotationsModule,
    SubscriptionsModule,
    TaxModule,
    DiscountsModule,
    InvoicesModule,
    PaymentsModule,
    BillingModule,
    ReportsModule,
  ],
})
export class AppModule {}

