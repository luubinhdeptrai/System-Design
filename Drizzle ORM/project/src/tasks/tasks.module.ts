import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { UsersModule } from '../users/users.module';

@Module({
  // Import UsersModule to access UsersService for user-existence validation
  imports: [UsersModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
})
export class TasksModule {}
