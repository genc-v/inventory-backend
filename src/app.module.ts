import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './infra/config/typeorm.config';
import { HealthModule } from './infra/modules/health.module';
import { ProductsModule } from './infra/modules/products.module';
import { UsersModule } from './infra/modules/users.module';
import { AuthModule } from './infra/modules/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    HealthModule,
    ProductsModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
