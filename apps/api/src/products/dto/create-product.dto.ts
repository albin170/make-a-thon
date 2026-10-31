import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['SERVICE','PHYSICAL','DIGITAL','SUBSCRIPTION'], default: 'SERVICE' })
  @IsEnum(['SERVICE','PHYSICAL','DIGITAL','SUBSCRIPTION']) @IsOptional() type?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: '99.99' }) @IsNumber() @Min(0) salesPrice: number;
  @ApiProperty({ example: '50.00' }) @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiProperty({ default: 'USD' }) @IsOptional() @IsString() currency?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' })
  @IsOptional() @IsEnum(['ACTIVE','INACTIVE']) status?: string;
}

