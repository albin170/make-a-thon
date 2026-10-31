import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned by login or a previous refresh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  refreshToken: string;
}
