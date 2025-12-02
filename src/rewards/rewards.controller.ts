import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { User } from '../auth/decorator/user.decorator';
import { RefillGiftCardDto } from './dto/reward.dto';

interface JwtPayloadUser {
  id: number;
  email: string;
}

@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  getSummary(@User() user: JwtPayloadUser) {
    return this.rewardsService.getRewardSummary(user.id);
  }

  @Post('refill')
  refill(@User() user: JwtPayloadUser, @Body() dto: RefillGiftCardDto) {
    return this.rewardsService.refillGiftCard(user.id, dto);
  }
}
