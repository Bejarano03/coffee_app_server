import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './menu.dto';
import type { MenuCategory } from './menu.constants';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: MenuCategory) {
    return this.prisma.menuItem.findMany({
      where: {
        category,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const menuItem = await this.prisma.menuItem.findUnique({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }

  create(createMenuItemDto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        ...createMenuItemDto,
        tags: createMenuItemDto.tags ?? [],
      },
    });
  }

  async update(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    await this.ensureExists(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: updateMenuItemDto,
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.menuItem.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.menuItem.count({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Menu item not found');
    }
  }
}
