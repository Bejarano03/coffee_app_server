import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { GiftCardTransactionType, Prisma, RewardTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RefillGiftCardDto } from './dto/reward.dto';
import Stripe from 'stripe';

const MAX_RECENT_TRANSACTIONS = 5;
const POINTS_PER_RELOAD_DOLLAR = 2;
export const FREE_DRINK_THRESHOLD = 12;

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY env var is not set. Gift card reloads will be disabled.');
      this.stripe = null;
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

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
    const requestedAmountCents = Math.round(dto.amount * 100);
    if (requestedAmountCents <= 0) {
      throw new BadRequestException('Reload amount must be greater than zero.');
    }

    const reloadNote = this.buildReloadNote(dto.paymentIntentId);
    const existingReload = await this.prisma.giftCardTransaction.findFirst({
      where: {
        userId,
        note: reloadNote,
      },
    });

    if (existingReload) {
      throw new BadRequestException('This reload has already been processed.');
    }

    const intent = await this.verifyGiftCardPayment(userId, dto.paymentIntentId, requestedAmountCents);
    const settledCents = intent.amount_received ?? intent.amount ?? 0;
    if (settledCents <= 0) {
      throw new BadRequestException('Stripe did not report a valid reload amount.');
    }

    const amountDecimal = new Prisma.Decimal((settledCents / 100).toFixed(2));
    const dollars = settledCents / 100;
    const pointsEarned = Math.floor(dollars * POINTS_PER_RELOAD_DOLLAR);

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
          note: reloadNote,
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

  async redeemFreeDrinks(userId: number, drinksRedeemed: number) {
    if (drinksRedeemed <= 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { freeCoffeeCredits: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const redeemable = Math.min(drinksRedeemed, user.freeCoffeeCredits);
      if (redeemable <= 0) {
        return;
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          freeCoffeeCredits: { decrement: redeemable },
        },
      });

      await tx.rewardTransaction.create({
        data: {
          userId,
          points: 0,
          reason: `Redeemed ${redeemable} free coffee${redeemable === 1 ? '' : 's'}.`,
          type: RewardTransactionType.REDEEM,
        },
      });
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

  private assertStripe(): Stripe {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured on the server.');
    }

    return this.stripe;
  }

  private buildReloadNote(paymentIntentId: string) {
    return `Stripe reload ${paymentIntentId}`;
  }

  private async verifyGiftCardPayment(
    userId: number,
    paymentIntentId: string,
    requestedAmountCents: number,
  ) {
    const stripe = this.assertStripe();
    let intent: Stripe.PaymentIntent;

    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent ${paymentIntentId}: ${error.message}`);
      throw new BadRequestException('Unable to verify Stripe payment. Please try again.');
    }

    if ((intent.metadata?.purpose ?? '') !== 'gift_card_reload') {
      throw new BadRequestException('Payment intent is not a gift card reload.');
    }

    if ((intent.metadata?.userId ?? '') !== userId.toString()) {
      throw new BadRequestException('Payment intent does not belong to this user.');
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Stripe payment has not completed yet.');
    }

    const settledCents = intent.amount_received ?? intent.amount ?? 0;
    if (settledCents !== requestedAmountCents) {
      throw new BadRequestException('Stripe payment amount does not match the requested reload.');
    }

    if ((intent.currency ?? '').toLowerCase() !== 'usd') {
      throw new BadRequestException('Unsupported currency for gift card reload.');
    }

    return intent;
  }
}
