import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../domain/users/user.entity';
import { USERS_REPOSITORY } from '../../domain/users/users.repository';
import { UsersService } from '../../application/users/users.service';
import { TypeormUsersRepository } from '../users/typeorm-users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    { provide: USERS_REPOSITORY, useClass: TypeormUsersRepository },
    UsersService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
