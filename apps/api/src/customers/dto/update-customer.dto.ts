import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
