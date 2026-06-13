import { Product } from '../products/product.entity';
import { Order } from './order.entity';

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface OrderUnitOfWork {
  lockProduct(productId: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<void>;
  saveOrder(order: Order): Promise<Order>;
}

export interface OrdersRepository {
  findAllForUser(userId: string): Promise<Order[]>;
  findOneForUser(userId: string, id: string): Promise<Order | null>;
  transaction<T>(work: (uow: OrderUnitOfWork) => Promise<T>): Promise<T>;
}
