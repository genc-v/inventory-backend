import { NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/orders/order.entity';
import { OrdersRepository } from '../../../domain/orders/orders.repository';
import { GetOrderUseCase } from './get-order.use-case';

describe('GetOrderUseCase', () => {
  function build(found: Order | null) {
    const findOneForUser = jest.fn().mockResolvedValue(found);
    const repo: OrdersRepository = {
      findAllForUser: jest.fn(),
      findOneForUser,
      transaction: jest.fn(),
    };
    return { findOneForUser, useCase: new GetOrderUseCase(repo) };
  }

  it('returns the order when it belongs to the user', async () => {
    const order = new Order();
    order.id = 'o-1';
    const { useCase } = build(order);

    await expect(useCase.execute('user-1', 'o-1')).resolves.toBe(order);
  });

  it('throws NotFound when the order is missing or not the user’s', async () => {
    const { useCase, findOneForUser } = build(null);

    await expect(useCase.execute('user-1', 'o-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findOneForUser).toHaveBeenCalledWith('user-1', 'o-1');
  });
});
