import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ResetPasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(256) token: string;
  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,128}$/, {
    message: 'Password must be 9-128 characters and contain uppercase, lowercase, and special characters.',
  })
  password: string;
}

