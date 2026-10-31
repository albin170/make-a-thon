import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: '560.00', description: 'Price adjustment added to product base price' })
  @IsNumber() priceAdjustment: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sku?: string;
  @ApiProperty({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

