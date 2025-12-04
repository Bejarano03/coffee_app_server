import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { CartService } from '../cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY env var is not set. Checkout is disabled until it is configured.');
      this.stripe = null;
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

  async createCheckoutIntent(userId: number) {
    const stripe = this.assertStripe();
    const cartItems = await this.cartService.getCartForUser(userId);

    if (!cartItems.length) {
      throw new BadRequestException('Your cart is empty.');
    }

    const amount = cartItems.reduce((total, line) => {
      const price = Number(line.menuItem.price ?? 0);
      const unitCents = Math.round(price * 100);
      return total + unitCents * line.quantity;
    }, 0);

    if (amount <= 0) {
      throw new BadRequestException('Cart total must be greater than zero.');
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: userId.toString(),
        },
      });

      if (!intent.client_secret) {
        throw new InternalServerErrorException('Failed to create payment intent.');
      }

      await this.createPendingOrder(userId, intent, cartItems, amount);

      return {
        clientSecret: intent.client_secret,
        amount,
        currency: intent.currency,
      };
    } catch (error) {
      this.logger.error(`Stripe payment intent failed: ${error.message}`);
      throw new InternalServerErrorException('Unable to start checkout. Please try again.');
    }
  }

  async createGiftCardReloadIntent(userId: number, amountDollars: number) {
    const stripe = this.assertStripe();
    const amountCents = Math.round(amountDollars * 100);

    if (amountCents <= 0) {
      throw new BadRequestException('Reload amount must be greater than zero.');
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: userId.toString(),
          purpose: 'gift_card_reload',
        },
      });

      if (!intent.client_secret) {
        throw new InternalServerErrorException('Failed to create payment intent.');
      }

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amountCents,
        currency: intent.currency,
      };
    } catch (error) {
      this.logger.error(`Stripe gift card reload intent failed: ${error.message}`);
      throw new InternalServerErrorException('Unable to start reload. Please try again.');
    }
  }

  private assertStripe(): Stripe {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured on the server.');
    }

    return this.stripe;
  }

  private async createPendingOrder(
    userId: number,
    intent: Stripe.PaymentIntent,
    cartItems: Awaited<ReturnType<CartService['getCartForUser']>>,
    amount: number,
  ) {
    try {
      await this.prisma.order.create({
        data: {
          userId,
          paymentIntentId: intent.id,
          amountCents: amount,
          currency: intent.currency ?? 'usd',
          items: {
            create: cartItems.map((line) => ({
              menuItemId: line.menuItemId,
              name: line.menuItem.name,
              unitPriceCents: Math.round(Number(line.menuItem.price ?? 0) * 100),
              quantity: line.quantity,
              milkOption: line.menuItem.category === 'COFFEE' ? line.milkOption : null,
              espressoShots: line.menuItem.category === 'COFFEE' ? line.espressoShots : null,
              flavorName: line.menuItem.category === 'COFFEE' ? line.flavorName : null,
              flavorPumps: line.menuItem.category === 'COFFEE' ? line.flavorPumps : null,
            })),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist pending order: ${error.message}`);
      // Attempt to clean up the unused payment intent to avoid orphaned Stripe objects.
      try {
        await this.stripe?.paymentIntents.cancel(intent.id);
      } catch (cancelError) {
        this.logger.warn(`Failed to cancel payment intent ${intent.id}: ${cancelError.message}`);
      }
      throw new InternalServerErrorException('Unable to save order. Please try again.');
    }
  }

  async handleWebhook(payload: Buffer, signature?: string) {
    const stripe = this.assertStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured.');
      throw new InternalServerErrorException('Webhook secret is missing.');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header.');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.warn(`Stripe webhook signature verification failed: ${error.message}`);
      throw new BadRequestException('Invalid Stripe signature.');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.markOrderStatus(event.data.object as Stripe.PaymentIntent, OrderStatus.PAID);
        break;
      case 'payment_intent.payment_failed':
        await this.markOrderStatus(event.data.object as Stripe.PaymentIntent, OrderStatus.FAILED);
        break;
      case 'payment_intent.canceled':
        await this.markOrderStatus(event.data.object as Stripe.PaymentIntent, OrderStatus.CANCELED);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async markOrderStatus(intent: Stripe.PaymentIntent, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { paymentIntentId: intent.id } });

    if (!order) {
      this.logger.warn(`No order found for payment intent ${intent.id}`);
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status },
    });
  }
}
