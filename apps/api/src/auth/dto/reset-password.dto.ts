import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(9) password: string;
}
