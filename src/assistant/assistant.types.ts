export interface AssistantResponsePayload {
  reply: string;
  guardrail?: 'transaction' | 'freebie' | 'support' | 'config' | 'error';
  suggestions: string[];
}

interface MenuHighlight {
  id: number;
  name: string;
  price: number;
  tags: string[];
  category: string;
}

interface FavoriteItemSummary {
  name: string;
  timesOrdered: number;
  lastOrderedAt: string;
}

interface OrderSummary {
  id: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

export interface AssistantContextSnapshot {
  profile: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  weather?: {
    description: string;
    feelsLike: number;
    temperature: number;
    units: 'metric' | 'imperial';
    location?: string;
  };
  favorites: FavoriteItemSummary[];
  recentOrders: OrderSummary[];
  menuHighlights: MenuHighlight[];
}
