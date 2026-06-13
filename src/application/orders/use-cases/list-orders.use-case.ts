import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../../../domain/orders/order.entity';
import { ORDERS_REPOSITORY } from '../../../domain/orders/orders.repository';
import type { OrdersRepository } from '../../../domain/orders/orders.repository';

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly orders: OrdersRepository,
  ) {}

  execute(userId: string): Promise<Order[]> {
    return this.orders.findAllForUser(userId);
  }
}
