import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/products/product.entity';
import {
  FindProductsOptions,
  ProductsRepository,
} from '../../domain/products/products.repository';

@Injectable()
export class TypeormProductsRepository implements ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  create(data: Partial<Product>): Promise<Product> {
    return this.repo.save(this.repo.create(data));
  }

  save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findMany(
    options: FindProductsOptions,
  ): Promise<{ data: Product[]; total: number }> {
    const [data, total] = await this.repo.findAndCount({
      where: options.category ? { category: options.category } : {},
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
    return { data, total };
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return !!result.affected;
  }
}
