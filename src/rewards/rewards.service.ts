import { Injectable, NotFoundException } from '@nestjs/common';
import { GiftCardTransactionType, Prisma, RewardTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RefillGiftCardDto } from './dto/reward.dto';

const MAX_RECENT_TRANSACTIONS = 5;
const POINTS_PER_RELOAD_DOLLAR = 2;
export const FREE_DRINK_THRESHOLD = 12;

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRewardSummary(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rewardPoints: true,
        lifetimeRewardPoints: true,
        giftCardBalance: true,
        freeCoffeeCredits: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [rewardTransactions, giftCardTransactions] = await Promise.all([
      this.prisma.rewardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_RECENT_TRANSACTIONS,
      }),
      this.prisma.giftCardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_RECENT_TRANSACTIONS,
      }),
    ]);

    const tierInfo = this.buildTierInfo(user.rewardPoints, user.freeCoffeeCredits);

    return {
      rewardPoints: user.rewardPoints,
      lifetimeRewardPoints: user.lifetimeRewardPoints,
      tier: tierInfo,
      punchCard: {
        pointsTowardsNextFreeDrink: user.rewardPoints,
        freeDrinkThreshold: FREE_DRINK_THRESHOLD,
        freeCoffeesAvailable: user.freeCoffeeCredits,
      },
      freeCoffeeCredits: user.freeCoffeeCredits,
      giftCardBalance: Number(user.giftCardBalance),
      recentRewardTransactions: rewardTransactions.map((tx) => ({
        id: tx.id,
        points: tx.points,
        reason: tx.reason,
        type: tx.type,
        createdAt: tx.createdAt,
      })),
      recentGiftCardTransactions: giftCardTransactions.map((tx) => ({
        id: tx.id,
        amount: Number(tx.amount),
        type: tx.type,
        note: tx.note,
        createdAt: tx.createdAt,
      })),
    };
  }

  async refillGiftCard(userId: number, dto: RefillGiftCardDto) {
    const amountDecimal = new Prisma.Decimal(dto.amount.toFixed(2));
    const pointsEarned = Math.floor(dto.amount * POINTS_PER_RELOAD_DOLLAR);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          giftCardBalance: { increment: amountDecimal },
        },
      });

      await tx.giftCardTransaction.create({
        data: {
          userId,
          amount: amountDecimal,
          type: GiftCardTransactionType.REFILL,
          note: 'Reloaded via mock Stripe checkout',
        },
      });

      await this.applyPointEarnings(tx, userId, pointsEarned, `Reload bonus (+${POINTS_PER_RELOAD_DOLLAR} pts per $1)`);
    });

    return this.getRewardSummary(userId);
  }

  async awardPurchasePoints(userId: number, pointsEarned: number) {
    if (pointsEarned <= 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.applyPointEarnings(tx, userId, pointsEarned, `Order rewards (${pointsEarned} punch${pointsEarned === 1 ? '' : 'es'})`);
    });
  }

  private buildTierInfo(pointsTowardsNext: number, freeCoffeeCredits: number) {
    const hasFreeCoffeeReady = freeCoffeeCredits > 0;
    const percentToNext = hasFreeCoffeeReady
      ? 100
      : Math.min(100, (pointsTowardsNext / FREE_DRINK_THRESHOLD) * 100);

    return {
      current: {
        name: hasFreeCoffeeReady ? 'Free coffee ready' : 'Coffee Club',
        threshold: hasFreeCoffeeReady ? FREE_DRINK_THRESHOLD : 0,
        tagline: hasFreeCoffeeReady
          ? `You have ${freeCoffeeCredits} free coffee${freeCoffeeCredits > 1 ? 's' : ''} to redeem.`
          : `Collect ${FREE_DRINK_THRESHOLD} punches to earn a free coffee.`,
      },
      next: hasFreeCoffeeReady
        ? null
        : {
            name: 'Free coffee reward',
            threshold: FREE_DRINK_THRESHOLD,
            tagline: `${Math.max(FREE_DRINK_THRESHOLD - pointsTowardsNext, 0)} punches remaining.`,
          },
      percentToNext,
      pointsUntilNext: hasFreeCoffeeReady ? 0 : Math.max(FREE_DRINK_THRESHOLD - pointsTowardsNext, 0),
    };
  }

  private async applyPointEarnings(
    tx: Prisma.TransactionClient,
    userId: number,
    pointsEarned: number,
    reason: string,
  ) {
    if (pointsEarned <= 0) {
      return;
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        rewardPoints: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const runningPoints = user.rewardPoints + pointsEarned;
    const freeCoffeeCreditsEarned = Math.floor(runningPoints / FREE_DRINK_THRESHOLD);
    const remainder = runningPoints % FREE_DRINK_THRESHOLD;

    await tx.user.update({
      where: { id: userId },
      data: {
        rewardPoints: remainder,
        lifetimeRewardPoints: { increment: pointsEarned },
        freeCoffeeCredits: { increment: freeCoffeeCreditsEarned },
      },
    });

    if (pointsEarned > 0) {
      await tx.rewardTransaction.create({
        data: {
          userId,
          points: pointsEarned,
          reason,
          type: RewardTransactionType.EARN,
        },
      });
    }
  }
}
