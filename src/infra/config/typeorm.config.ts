import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const isProduction = config.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'inventory'),
    autoLoadEntities: true,
    synchronize: !isProduction,
  };
}
