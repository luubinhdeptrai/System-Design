import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

/**
 * TasksController — HTTP adapter layer for tasks.
 *
 * GET /tasks           → all tasks
 * GET /tasks?userId=5  → tasks for user 5
 * GET /tasks/:id       → single task with user info (joined)
 * POST /tasks          → create task
 * PATCH /tasks/:id     → update task
 * DELETE /tasks/:id    → delete task
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks or GET /tasks?userId=5
  @Get()
  findAll(
    // ParseIntPipe with optional: true — coerces when present, ignores when absent
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    if (userId) return this.tasksService.findByUserId(userId);
    return this.tasksService.findAll();
  }

  // GET /tasks/:id → 200 { task, user } | 404
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findById(id);
  }

  // POST /tasks → 201 Task | 400 (validation) | 404 (user not found)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  // PATCH /tasks/:id → 200 Task | 404
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto);
  }

  // DELETE /tasks/:id → 204 | 404
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
