import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RewardsModule } from './rewards/rewards.module';

@Module({
  imports: [PrismaModule, RewardsModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
