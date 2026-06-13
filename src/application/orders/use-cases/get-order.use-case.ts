import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/orders/order.entity';
import { ORDERS_REPOSITORY } from '../../../domain/orders/orders.repository';
import type { OrdersRepository } from '../../../domain/orders/orders.repository';

@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly orders: OrdersRepository,
  ) {}

  async execute(userId: string, id: string): Promise<Order> {
    const order = await this.orders.findOneForUser(userId, id);

    if (!order) throw new NotFoundException(`Order ${id} not found`);

    return order;
  }
}
