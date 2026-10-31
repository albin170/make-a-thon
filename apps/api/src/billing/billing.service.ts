import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BillingScheduler } from './billing.scheduler';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: BillingScheduler,
  ) {}

  async listRuns(q: { page?: number; limit?: number }) {
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 20, 100);
    const [data, total] = await Promise.all([
      this.prisma.billingRun.findMany({
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { periods: true } } },
      }),
      this.prisma.billingRun.count(),
    ]);
    return { data, total, page, limit };
  }

  async getRun(id: string) {
    const run = await this.prisma.billingRun.findUnique({
      where: { id },
      include: {
        periods: {
          include: { subscription: { include: { customer: { include: { user: true } } } } },
          take: 100,
        },
      },
    });
    if (!run) throw new NotFoundException(`Billing run ${id} not found.`);
    return run;
  }

  async triggerManualRun() {
    await this.scheduler.scheduleDueSubscriptions();
    return { message: 'Manual billing run triggered.' };
  }
}
