import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TaxType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTaxRuleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({ example: 18 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ enum: TaxType })
  @IsEnum(TaxType)
  type: TaxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jurisdiction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxRuleDto extends PartialType(CreateTaxRuleDto) {}
