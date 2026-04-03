import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit {
  private client: PrismaClient;

  constructor() {
    // Create PrismaClient.
    // For Prisma v7, ensure schema.prisma has url and provider configured.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    this.client = new (PrismaClient as any)({});
  }

  async onModuleInit() {
    // Connect to database on module init.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.client as any).$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    // Register shutdown hook so app closes gracefully.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this.client as any).$on?.('beforeExit', async () => {
      await app.close();
    });
  }

  // Expose key Prisma models and methods for services to use
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  get user() {
    return (this.client as any).user;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  get task() {
    return (this.client as any).task;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  get $transaction() {
    return (this.client as any).$transaction;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  get $disconnect() {
    return (this.client as any).$disconnect;
  }
}
