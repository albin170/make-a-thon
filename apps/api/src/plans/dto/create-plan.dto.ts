import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { BillingInterval, PlanStatus } from '@prisma/client';

export class CreatePlanProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 99.99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxQty?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalCount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCloseOnEnd?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowEarlyClosure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowPause?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRenewal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxQuantity?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [CreatePlanProductDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanProductDto)
  products?: CreatePlanProductDto[];
}
