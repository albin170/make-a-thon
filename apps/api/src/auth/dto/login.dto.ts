import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email address or username (admin / staff)' })
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
