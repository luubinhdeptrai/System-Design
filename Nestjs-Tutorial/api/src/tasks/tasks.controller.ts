import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReqUser } from '../common/decorators/request-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  @Post()
  create(@ReqUser() user: { userId: string }, @Body() dto: CreateTaskDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.tasks.create(user.userId, dto);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  @Get()
  list(@ReqUser() user: { userId: string }) {
    return this.tasks.list(user.userId);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  @Get(':id')
  get(@ReqUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.get(user.userId, id);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  @Patch(':id')
  update(@ReqUser() user: { userId: string }, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user.userId, id, dto);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  @Delete(':id')
  remove(@ReqUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.remove(user.userId, id);
  }
}