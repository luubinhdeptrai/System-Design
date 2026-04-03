import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

/**
 * All fields from CreateTaskDto become optional.
 * class-validator decorators are inherited and applied when the field is present.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
