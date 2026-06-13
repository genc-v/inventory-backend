import { ConflictException, NotFoundException } from '@nestjs/common';
import { Product } from '../../../domain/products/product.entity';
import { Order } from '../../../domain/orders/order.entity';
import {
  OrderUnitOfWork,
  OrdersRepository,
} from '../../../domain/orders/orders.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { PlaceOrderUseCase } from './place-order.use-case';

const USER_ID = 'user-1';

function product(id: string, price: number, stock: number): Product {
  const p = new Product();
  p.id = id;
  p.name = `Product ${id}`;
  p.price = price;
  p.stockQuantity = stock;
  return p;
}

function buildRepo(stock: Record<string, Product>) {
  const lockOrder: string[] = [];
  let savedOrder: Order | undefined;

  const uow: OrderUnitOfWork = {
    lockProduct: (id) => {
      lockOrder.push(id);
      return Promise.resolve(stock[id] ?? null);
    },
    saveProduct: () => Promise.resolve(),
    saveOrder: (order) => {
      savedOrder = order;
      return Promise.resolve(order);
    },
  };

  const repo: OrdersRepository = {
    findAllForUser: jest.fn(),
    findOneForUser: jest.fn(),
    transaction: (work) => work(uow),
  };

  return {
    repo,
    lockOrder,
    saveOrder: jest.spyOn(uow, 'saveOrder'),
    saveProduct: jest.spyOn(uow, 'saveProduct'),
    getSavedOrder: () => savedOrder,
  };
}

function dto(items: { productId: string; quantity: number }[]): CreateOrderDto {
  return { items };
}

describe('PlaceOrderUseCase', () => {
  it('decrements stock and computes the total with per-line price snapshots', async () => {
    const widget = product('a', 9.99, 5);
    const gadget = product('b', 2.5, 10);
    const ctx = buildRepo({ a: widget, b: gadget });
    const useCase = new PlaceOrderUseCase(ctx.repo);

    const order = await useCase.execute(
      USER_ID,
      dto([
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 3 },
      ]),
    );

    expect(widget.stockQuantity).toBe(3);
    expect(gadget.stockQuantity).toBe(7);
    expect(order.total).toBe(27.48);
    expect(order.userId).toBe(USER_ID);
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({
      productId: 'a',
      quantity: 2,
      unitPrice: 9.99,
      lineTotal: 19.98,
    });
  });

  it('rejects the order and saves nothing when stock is insufficient (no overselling)', async () => {
    const lastOne = product('a', 5, 1);
    const ctx = buildRepo({ a: lastOne });
    const useCase = new PlaceOrderUseCase(ctx.repo);

    await expect(
      useCase.execute(USER_ID, dto([{ productId: 'a', quantity: 2 }])),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(lastOne.stockQuantity).toBe(1);
    expect(ctx.saveProduct).not.toHaveBeenCalled();
    expect(ctx.saveOrder).not.toHaveBeenCalled();
  });

  it('throws NotFound when a requested product does not exist', async () => {
    const ctx = buildRepo({});
    const useCase = new PlaceOrderUseCase(ctx.repo);

    await expect(
      useCase.execute(USER_ID, dto([{ productId: 'missing', quantity: 1 }])),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.saveOrder).not.toHaveBeenCalled();
  });

  it('locks products in deterministic id-sorted order to avoid deadlocks', async () => {
    const ctx = buildRepo({
      a: product('a', 1, 100),
      b: product('b', 1, 100),
      c: product('c', 1, 100),
    });
    const useCase = new PlaceOrderUseCase(ctx.repo);

    await useCase.execute(
      USER_ID,
      dto([
        { productId: 'c', quantity: 1 },
        { productId: 'a', quantity: 1 },
        { productId: 'b', quantity: 1 },
      ]),
    );

    expect(ctx.lockOrder).toEqual(['a', 'b', 'c']);
  });

  it('aggregates duplicate line items for the same product before validating stock', async () => {
    const widget = product('a', 4, 3);
    const ctx = buildRepo({ a: widget });
    const useCase = new PlaceOrderUseCase(ctx.repo);

    await expect(
      useCase.execute(
        USER_ID,
        dto([
          { productId: 'a', quantity: 2 },
          { productId: 'a', quantity: 2 },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ctx.lockOrder).toEqual(['a']);
    expect(widget.stockQuantity).toBe(3);
  });
});
