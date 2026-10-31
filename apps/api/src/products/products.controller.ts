import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List all products (paginated)' })
  findAll(@Query() query: { page?: number; limit?: number; search?: string; status?: string }) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  // Variants
  @Get(':id/variants')
  @Roles('ADMIN', 'STAFF')
  getVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getVariants(id);
  }

  @Post(':id/variants')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(productId, dto);
  }
}

