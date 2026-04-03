import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * PartialType makes every field from CreateUserDto optional.
 * All class-validator decorators are inherited and still enforced when the field is present.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
