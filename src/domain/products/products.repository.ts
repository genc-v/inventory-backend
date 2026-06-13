import { Product } from './product.entity';

export const PRODUCTS_REPOSITORY = Symbol('PRODUCTS_REPOSITORY');

export interface FindProductsOptions {
  category?: string;
  page: number;
  limit: number;
}

export interface ProductsRepository {
  create(data: Partial<Product>): Promise<Product>;
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findMany(
    options: FindProductsOptions,
  ): Promise<{ data: Product[]; total: number }>;
  deleteById(id: string): Promise<boolean>;
}
