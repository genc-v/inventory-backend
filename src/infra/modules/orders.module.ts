import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../domain/orders/order.entity';
import { OrderItem } from '../../domain/orders/order-item.entity';
import { ORDERS_REPOSITORY } from '../../domain/orders/orders.repository';
import { PlaceOrderUseCase } from '../../application/orders/use-cases/place-order.use-case';
import { ListOrdersUseCase } from '../../application/orders/use-cases/list-orders.use-case';
import { GetOrderUseCase } from '../../application/orders/use-cases/get-order.use-case';
import { OrdersController } from '../../api/orders/orders.controller';
import { TypeormOrdersRepository } from '../orders/typeorm-orders.repository';
import { ProductsModule } from './products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), ProductsModule],
  controllers: [OrdersController],
  providers: [
    { provide: ORDERS_REPOSITORY, useClass: TypeormOrdersRepository },
    PlaceOrderUseCase,
    ListOrdersUseCase,
    GetOrderUseCase,
  ],
})
export class OrdersModule {}
