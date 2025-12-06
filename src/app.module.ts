import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { MenuModule } from './menu.module';
import { CartModule } from './cart.module';
import { RewardsModule } from './rewards/rewards.module';
import { PaymentsModule } from './payments/payments.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    ProfileModule,
    MenuModule,
    CartModule,
    RewardsModule,
    PaymentsModule,
    AssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
