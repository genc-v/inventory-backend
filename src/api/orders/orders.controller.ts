import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlaceOrderUseCase } from '../../application/orders/use-cases/place-order.use-case';
import { ListOrdersUseCase } from '../../application/orders/use-cases/list-orders.use-case';
import { GetOrderUseCase } from '../../application/orders/use-cases/get-order.use-case';
import { CreateOrderDto } from '../../application/orders/dto/create-order.dto';
import { JwtAuthGuard } from '../../infra/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../domain/auth/authenticated-user';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrder: PlaceOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.placeOrder.execute(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.listOrders.execute(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getOrder.execute(user.id, id);
  }
}
