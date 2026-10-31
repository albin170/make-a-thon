import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscriptionActionDto {
  @ApiPropertyOptional({ example: 'Customer requested pause' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
