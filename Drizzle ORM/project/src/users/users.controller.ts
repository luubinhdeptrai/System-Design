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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * UsersController — HTTP adapter layer.
 *
 * Responsibilities:
 *  - Parse HTTP inputs: route params, request body, query strings
 *  - Delegate to UsersService for all logic
 *  - Return the correct HTTP status codes
 *
 * Rule: zero business logic in this class.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users → 200 User[]
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/:id → 200 User | 404
  // ParseIntPipe: coerces string param → number; throws 400 on invalid value
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  // POST /users → 201 User | 409 (duplicate email)
  @Post()
  @HttpCode(HttpStatus.CREATED)         // explicit 201 for resource creation
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // PATCH /users/:id → 200 User | 404 | 409
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  // DELETE /users/:id → 204 (no body) | 404
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)      // 204: success with no response body
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
