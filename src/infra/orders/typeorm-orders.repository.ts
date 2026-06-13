import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../../domain/products/product.entity';
import { Order } from '../../domain/orders/order.entity';
import {
  OrdersRepository,
  OrderUnitOfWork,
} from '../../domain/orders/orders.repository';

@Injectable()
export class TypeormOrdersRepository implements OrdersRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  findAllForUser(userId: string): Promise<Order[]> {
    return this.orders.find({
      where: { userId },
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
    });
  }

  findOneForUser(userId: string, id: string): Promise<Order | null> {
    return this.orders.findOne({
      where: { id, userId },
      relations: { items: { product: true } },
    });
  }

  transaction<T>(work: (uow: OrderUnitOfWork) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => {
      const uow: OrderUnitOfWork = {
        lockProduct: (productId) =>
          manager.findOne(Product, {
            where: { id: productId },
            lock: { mode: 'pessimistic_write' },
          }),
        saveProduct: async (product) => {
          await manager.save(Product, product);
        },
        saveOrder: (order) => manager.save(Order, order),
      };
      return work(uow);
    });
  }
}
