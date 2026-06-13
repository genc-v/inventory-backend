import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../domain/products/product.entity';
import { PRODUCTS_REPOSITORY } from '../../domain/products/products.repository';
import { ProductsService } from '../../application/products/products.service';
import { ProductsController } from '../../api/products/products.controller';
import { TypeormProductsRepository } from '../products/typeorm-products.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [
    { provide: PRODUCTS_REPOSITORY, useClass: TypeormProductsRepository },
    ProductsService,
  ],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
