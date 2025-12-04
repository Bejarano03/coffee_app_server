import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { User } from './auth/decorator/user.decorator';
import { AddCartItemDto, ToggleFreeDrinkDto, UpdateCartItemDto } from './cart.dto';

interface AuthenticatedUser {
  id: number;
  email: string;
}

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@User() user: AuthenticatedUser) {
    return this.cartService.getCartForUser(user.id);
  }

  @Post('items')
  addItem(@User() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:cartItemId')
  updateItem(
    @User() user: AuthenticatedUser,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(user.id, cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  removeItem(@User() user: AuthenticatedUser, @Param('cartItemId', ParseIntPipe) cartItemId: number) {
    return this.cartService.removeItem(user.id, cartItemId);
  }

  @Delete()
  clearCart(@User() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.id);
  }

  @Patch('items/:cartItemId/free-drink')
  toggleFreeDrink(
    @User() user: AuthenticatedUser,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Body() dto: ToggleFreeDrinkDto,
  ) {
    return this.cartService.toggleFreeDrink(user.id, cartItemId, dto);
  }
}
