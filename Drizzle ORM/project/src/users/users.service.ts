import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../database/schema';

/**
 * UsersService — business logic layer for the users feature.
 *
 * Responsibilities:
 *  - Enforce domain invariants (email uniqueness, existence checks)
 *  - Throw typed NestJS exceptions that auto-map to HTTP status codes
 *  - Delegate all data access to UsersRepository
 *
 * Rule: zero SQL, zero HTTP knowledge in this class.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  /**
   * Throws 404 if the user does not exist.
   * Exported so other modules (e.g., TasksService) can verify user existence.
   */
  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Business rule: email addresses must be globally unique
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.usersRepository.create(dto);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      // Allow updating to the same email (user re-submits their own email)
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use by another account');
      }
    }
    const user = await this.usersRepository.update(id, dto);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.usersRepository.delete(id);
    // Never silently succeed — callers must know if the resource was actually removed
    if (!deleted) throw new NotFoundException(`User #${id} not found`);
  }
}
