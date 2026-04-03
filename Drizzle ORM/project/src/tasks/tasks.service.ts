import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from '../database/schema';

/**
 * TasksService — business logic for the tasks feature.
 *
 * Cross-module dependency: injects UsersService (via UsersModule export)
 * to verify user existence without leaking direct DB access into this module.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly usersService: UsersService,  // cross-module dep, not cross-repo
  ) {}

  findAll(): Promise<Task[]> {
    return this.tasksRepository.findAll();
  }

  /**
   * Returns { task, user } shape from a LEFT JOIN query.
   * Throws 404 if the task does not exist.
   */
  async findById(id: number) {
    const result = await this.tasksRepository.findByIdWithUser(id);
    if (!result) throw new NotFoundException(`Task #${id} not found`);
    return result;
  }

  async findByUserId(userId: number): Promise<Task[]> {
    // Verify the user exists (throws 404 if not) before querying their tasks.
    // Gives a meaningful "User #X not found" instead of an empty array that
    // could be misinterpreted as "user has no tasks".
    await this.usersService.findById(userId);
    return this.tasksRepository.findByUserId(userId);
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    // Ensure the target user exists before inserting — gives a clean 404
    // instead of a cryptic PostgreSQL FK violation error.
    await this.usersService.findById(dto.userId);
    return this.tasksRepository.create(dto);
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    // If userId is being changed, verify the new user exists
    if (dto.userId !== undefined) {
      await this.usersService.findById(dto.userId);
    }
    const task = await this.tasksRepository.update(id, dto);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.tasksRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Task #${id} not found`);
  }
}
