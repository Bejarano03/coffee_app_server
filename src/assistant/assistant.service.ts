import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AssistantMessageDto, AssistantHistoryMessageDto, WeatherSnapshotDto } from './assistant.dto';
import { AssistantContextSnapshot, AssistantResponsePayload } from './assistant.types';
import { ASSISTANT_FAQ, ASSISTANT_POLICIES } from './assistant.constants';

const MAX_HISTORY = 8;
const MAX_MENU_RESULTS = 25;
const SUGGESTION_LIBRARY = [
  'Recommend a drink for today\'s weather',
  'Suggest something similar to my recent orders',
  'Explain how the rewards tiers work',
  'Pair a pastry with my favorite latte',
  'Share the most popular seasonal drink',
];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly supportEmail = process.env.COFFEE_APP_SUPPORT_EMAIL ?? 'support@coffeeapp.example';
  private readonly openai: OpenAI | null;

  private readonly freebiePattern = /(free\s+(?:drink|coffee|latte|item)|on\s+the\s+house|comped?\s+drink|discount|coupon|promo)/i;
  private readonly transactionPattern = /(refund|charge|transaction|payment|gift\s*card|card\s+number|reload|billing)/i;
  private readonly supportPattern = /(human support|talk to (?:a )?(?:human|agent|manager)|escalate|complaint|customer support|customer service)/i;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY env var is not set. Assistant responses will be stubbed.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async handleMessage(userId: number, payload: AssistantMessageDto): Promise<AssistantResponsePayload> {
    const guardrailResponse = this.evaluateGuardrails(payload.message);
    if (guardrailResponse) {
      return guardrailResponse;
    }

    const history = this.truncateHistory(payload.history ?? []);
    const context = await this.buildContextSnapshot(userId, payload.weather);

    if (!this.openai) {
      return {
        reply: 'The Coffee Companion is warming up. Please try again shortly or email support if you need urgent help.',
        guardrail: 'config',
        suggestions: this.pickSuggestions(),
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(context),
          },
          ...history,
          { role: 'user', content: payload.message },
        ],
      });

      const reply = completion.choices?.[0]?.message?.content;
      return {
        reply: typeof reply === 'string' ? reply.trim() : (reply ?? 'I\'m here if you want to chat about coffee or rewards!'),
        suggestions: this.pickSuggestions(context),
      };
    } catch (error) {
      this.logger.error('Assistant call failed', error as Error);
      throw new InternalServerErrorException('The assistant is unavailable right now. Please try again in a moment.');
    }
  }

  private evaluateGuardrails(message: string): AssistantResponsePayload | null {
    const normalized = message.toLowerCase();

    if (this.supportPattern.test(normalized)) {
      return {
        reply: `I\'m happy to help with general questions, but for account or billing support please email ${this.supportEmail} so a human teammate can jump in.`,
        guardrail: 'support',
        suggestions: this.pickSuggestions(),
      };
    }

    if (this.freebiePattern.test(normalized)) {
      return {
        reply: 'I can recommend drinks, but I\'m not allowed to grant free drinks or discounts. Let me suggest something you might love instead!',
        guardrail: 'freebie',
        suggestions: this.pickSuggestions(),
      };
    }

    if (this.transactionPattern.test(normalized)) {
      return {
        reply: 'For payments, refunds, or gift card changes please visit the payments tab or email support so we can keep your data safe.',
        guardrail: 'transaction',
        suggestions: this.pickSuggestions(),
      };
    }

    return null;
  }

  private truncateHistory(history: AssistantHistoryMessageDto[]): AssistantHistoryMessageDto[] {
    if (!history.length) {
      return [];
    }

    return history.slice(-MAX_HISTORY);
  }

  private async buildContextSnapshot(
    userId: number,
    weather?: WeatherSnapshotDto,
  ): Promise<AssistantContextSnapshot> {
    const [user, menuItems, orders] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      }),
      this.prisma.menuItem.findMany({
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
        take: MAX_MENU_RESULTS,
        select: { id: true, name: true, price: true, tags: true, category: true },
      }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: { select: { name: true, quantity: true } } },
      }),
    ]);

    const favorites = this.buildFavoriteSummary(orders);
    const recentOrders = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    }));

    return {
      profile: {
        firstName: user?.firstName ?? undefined,
        lastName: user?.lastName ?? undefined,
        email: user?.email ?? 'user@coffee.app',
      },
      favorites,
      recentOrders,
      weather: weather
        ? {
            description: weather.description,
            feelsLike: weather.feelsLike,
            temperature: weather.temperature,
            units: weather.units,
            location: weather.locationName,
          }
        : undefined,
      menuHighlights: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        tags: item.tags ?? [],
        category: item.category,
      })),
    };
  }

  private buildFavoriteSummary(orders: { items: { name: string; quantity: number }[]; createdAt: Date }[]) {
    const counts = new Map<string, { name: string; total: number; lastOrderedAt: string }>();

    for (const order of orders) {
      for (const item of order.items) {
        const entry = counts.get(item.name) ?? {
          name: item.name,
          total: 0,
          lastOrderedAt: order.createdAt.toISOString(),
        };
        entry.total += item.quantity;
        entry.lastOrderedAt = order.createdAt.toISOString();
        counts.set(item.name, entry);
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((entry) => ({
        name: entry.name,
        timesOrdered: entry.total,
        lastOrderedAt: entry.lastOrderedAt,
      }));
  }

  private buildSystemPrompt(context: AssistantContextSnapshot): string {
    const favoriteLine = context.favorites.length
      ? context.favorites
          .map((fav) => `${fav.name} (ordered ${fav.timesOrdered}×, last on ${fav.lastOrderedAt})`)
          .join('; ')
      : 'No favorites yet';

    const menuHighlights = context.menuHighlights
      .map((item) => `${item.name} - $${item.price.toFixed(2)} [${item.tags.slice(0, 2).join(', ') || item.category}]`)
      .slice(0, 8)
      .join('\n');

    const weatherLine = context.weather
      ? `${context.weather.description} with a temperature of ${Math.round(context.weather.temperature)}°${context.weather.units === 'metric' ? 'C' : 'F'} (feels like ${Math.round(context.weather.feelsLike)}°).`
      : 'Weather information is unavailable. Make general recommendations.';

    const faqBlock = ASSISTANT_FAQ.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n');

    return [
      'You are Coffee Companion, an internal MCP agent for the Coffee App.',
      'Capabilities: answer FAQs, hold casual conversations, and recommend menu items using the provided context.',
      `Policies: ${ASSISTANT_POLICIES.guardrails} Never discuss transactions; instead remind the user to use the payments tab or email support at ${this.supportEmail}.`,
      'Data Governance: never expose internal IDs or mention data about other users. Only reference the context attached here.',
      `User profile: ${context.profile.firstName ?? ''} ${context.profile.lastName ?? ''} (${context.profile.email}).`,
      `Weather: ${weatherLine}`,
      `Favorite items: ${favoriteLine}.`,
      'Recent orders:',
      context.recentOrders
        .map((order) => `Order ${order.id} on ${order.createdAt}: ${order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}`)
        .join('\n') || 'No recent orders recorded.',
      'Menu highlights:\n' + (menuHighlights || 'Menu data missing, keep responses generic but upbeat.'),
      'FAQ library:\n' + faqBlock,
      'Customer service escalation: when asked or when a task is impossible, instruct the user to email ' + this.supportEmail + '.',
      'Tone: friendly, concise, and pro-active. When recommending drinks tie back to weather or favorites when possible.',
    ].join('\n\n');
  }

  private pickSuggestions(context?: AssistantContextSnapshot): string[] {
    const suggestions = [...SUGGESTION_LIBRARY];

    if (context?.favorites?.length) {
      suggestions.unshift(`Suggest something similar to ${context.favorites[0].name}`);
    }

    if (context?.weather) {
      suggestions.unshift('What coffee fits this weather?');
    }

    return suggestions.slice(0, 3);
  }
}
