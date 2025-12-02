import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuCategory, MilkOption } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';
import { RewardsService } from './rewards/rewards.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsService: RewardsService,
  ) {}

  getCartForUser(userId: number) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        menuItem: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const { menuItemId, quantity = 1 } = dto;
    const normalizedMilk = dto.milkOption ?? MilkOption.WHOLE;
    const espressoShots = dto.espressoShots ?? 2;
    const flavorName = dto.flavorName?.trim() || null;
    const flavorPumps = dto.flavorPumps ?? (flavorName ? 0 : null);
    const customizationKey = this.buildCustomizationKey({
      milkOption: normalizedMilk,
      espressoShots,
      flavorName,
      flavorPumps,
    });

    await this.ensureMenuItemExists(menuItemId);

    const existing = await this.prisma.cartItem.findFirst({
      where: { userId, menuItemId, customizationKey },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: quantity },
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          userId,
          menuItemId,
          quantity,
          milkOption: normalizedMilk,
          espressoShots,
          flavorName,
          flavorPumps,
          customizationKey,
        },
      });
    }

    return this.getCartForUser(userId);
  }

  async updateQuantity(userId: number, cartItemId: number, dto: UpdateCartItemDto) {
    const existing = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: dto.quantity },
      });
    }

    return this.getCartForUser(userId);
  }

  async removeItem(userId: number, cartItemId: number) {
    const existing = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: existing.id } });
    return this.getCartForUser(userId);
  }

  async clearCart(userId: number) {
    const existingItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { menuItem: true },
    });

    if (!existingItems.length) {
      return [];
    }

    await this.prisma.cartItem.deleteMany({ where: { userId } });

    const qualifyingPunches = existingItems.reduce((total, line) => {
      if (line.menuItem.category === MenuCategory.COFFEE || line.menuItem.category === MenuCategory.PASTRY) {
        return total + line.quantity;
      }
      return total;
    }, 0);

    if (qualifyingPunches > 0) {
      await this.rewardsService.awardPurchasePoints(userId, qualifyingPunches);
    }

    return this.getCartForUser(userId);
  }

  private async ensureMenuItemExists(menuItemId: number) {
    const exists = await this.prisma.menuItem.count({
      where: { id: menuItemId, isAvailable: true },
    });

    if (!exists) {
      throw new NotFoundException('Menu item not found');
    }
  }

  private buildCustomizationKey(input: {
    milkOption: MilkOption;
    espressoShots: number;
    flavorName: string | null;
    flavorPumps: number | null;
  }) {
    return JSON.stringify({
      milkOption: input.milkOption,
      espressoShots: input.espressoShots,
      flavorName: input.flavorName ?? '',
      flavorPumps: input.flavorPumps ?? 0,
    });
  }
}
