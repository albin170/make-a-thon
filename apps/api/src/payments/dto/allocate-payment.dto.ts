import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AllocatePaymentDto {
  @ApiProperty()
  @IsString()
  invoiceId: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
