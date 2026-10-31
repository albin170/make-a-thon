import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class CreateStaffDto extends OmitType(CreateUserDto, ['role'] as const) {}
