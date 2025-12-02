import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

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

    await this.ensureMenuItemExists(menuItemId);

    await this.prisma.cartItem.upsert({
      where: { userId_menuItemId: { userId, menuItemId } },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        userId,
        menuItemId,
        quantity,
      },
    });

    return this.getCartForUser(userId);
  }

  async updateQuantity(userId: number, menuItemId: number, dto: UpdateCartItemDto) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_menuItemId: { userId, menuItemId } },
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

  async removeItem(userId: number, menuItemId: number) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_menuItemId: { userId, menuItemId } },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: existing.id } });
    return this.getCartForUser(userId);
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
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
}
