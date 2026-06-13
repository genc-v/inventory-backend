import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../../domain/products/product.entity';
import { PRODUCTS_REPOSITORY } from '../../domain/products/products.repository';
import type { ProductsRepository } from '../../domain/products/products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface FindProductsInput {
  category?: string;
  page?: number;
  limit?: number;
}

export interface ProductPage {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCTS_REPOSITORY)
    private readonly products: ProductsRepository,
  ) {}

  create(dto: CreateProductDto): Promise<Product> {
    return this.products.create(dto);
  }

  async findAll(input: FindProductsInput = {}): Promise<ProductPage> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));

    const { data, total } = await this.products.findMany({
      category: input.category,
      page,
      limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findById(id);

    if (!product) throw new NotFoundException(`Product ${id} not found`);

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.products.save(product);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.products.deleteById(id);

    if (!deleted) throw new NotFoundException(`Product ${id} not found`);
  }
}
