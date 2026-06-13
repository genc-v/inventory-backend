import { NotFoundException } from '@nestjs/common';
import { Product } from '../../domain/products/product.entity';
import { ProductsRepository } from '../../domain/products/products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  function build() {
    const findById = jest.fn();
    const findMany = jest.fn().mockResolvedValue({ data: [], total: 0 });
    const repo: ProductsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById,
      findMany,
      deleteById: jest.fn(),
    };
    return { findById, findMany, service: new ProductsService(repo) };
  }

  it('throws NotFound when a product does not exist', async () => {
    const { service, findById } = build();
    findById.mockResolvedValue(null);

    await expect(service.findOne('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the product when it exists', async () => {
    const { service, findById } = build();
    const product = new Product();
    product.id = 'p-1';
    findById.mockResolvedValue(product);

    await expect(service.findOne('p-1')).resolves.toBe(product);
  });

  it('clamps pagination to sane defaults and bounds', async () => {
    const { service, findMany } = build();

    await service.findAll();
    expect(findMany).toHaveBeenCalledWith({
      category: undefined,
      page: 1,
      limit: 20,
    });

    const result = await service.findAll({ page: 0, limit: 999 });
    expect(findMany).toHaveBeenLastCalledWith({
      category: undefined,
      page: 1,
      limit: 100,
    });
    expect(result).toMatchObject({ page: 1, limit: 100, total: 0 });
  });
});
