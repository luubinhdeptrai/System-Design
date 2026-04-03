import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // ConfigModule.forRoot() reads .env and makes ConfigService available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // DatabaseModule is @Global — all feature modules receive DRIZZLE without importing it
    DatabaseModule,

    // Feature modules
    UsersModule,
    TasksModule,
  ],
})
export class AppModule {}
