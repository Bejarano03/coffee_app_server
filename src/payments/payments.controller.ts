import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorator/user.decorator';
import { Request } from 'express';
import { CreateGiftCardReloadIntentDto } from './dto/create-gift-card-intent.dto';

interface AuthenticatedUser {
  id: number;
  email: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  createIntent(@User() user: AuthenticatedUser) {
    return this.paymentsService.createCheckoutIntent(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('gift-card-intent')
  createGiftCardIntent(
    @User() user: AuthenticatedUser,
    @Body() dto: CreateGiftCardReloadIntentDto,
  ) {
    return this.paymentsService.createGiftCardReloadIntent(user.id, dto.amount);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    return this.paymentsService.handleWebhook(req.body as Buffer, signature);
  }
}
