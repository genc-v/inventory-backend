import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order } from '../../../domain/orders/order.entity';
import { OrderItem } from '../../../domain/orders/order-item.entity';
import { ORDERS_REPOSITORY } from '../../../domain/orders/orders.repository';
import type { OrdersRepository } from '../../../domain/orders/orders.repository';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly orders: OrdersRepository,
  ) {}

  async execute(userId: string, dto: CreateOrderDto): Promise<Order> {
    const requestedQty = this.aggregateQuantities(dto);
    const productIds = [...requestedQty.keys()].sort();

    return this.orders.transaction(async (uow) => {
      let total = 0;
      const items: OrderItem[] = [];

      for (const productId of productIds) {
        const quantity = requestedQty.get(productId)!;

        const product = await uow.lockProduct(productId);

        if (!product)
          throw new NotFoundException(`Product ${productId} not found`);

        if (product.stockQuantity < quantity)
          throw new ConflictException(
            `Insufficient stock for "${product.name}": requested ${quantity}, available ${product.stockQuantity}`,
          );

        product.stockQuantity -= quantity;
        await uow.saveProduct(product);

        const lineTotal = Number((product.price * quantity).toFixed(2));
        total += lineTotal;

        const item = new OrderItem();
        item.productId = product.id;
        item.quantity = quantity;
        item.unitPrice = product.price;
        item.lineTotal = lineTotal;
        items.push(item);
      }

      const order = new Order();
      order.userId = userId;
      order.total = Number(total.toFixed(2));
      order.items = items;

      return uow.saveOrder(order);
    });
  }

  private aggregateQuantities(dto: CreateOrderDto): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of dto.items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }
}
