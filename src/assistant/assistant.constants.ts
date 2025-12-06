export const ASSISTANT_FAQ = [
  {
    question: 'How do I earn reward points?',
    answer:
      'You earn 10 reward points for every dollar spent in the app. Hitting new tiers unlocks perks, and every 80 points adds a free coffee credit.',
  },
  {
    question: 'How do I redeem a free drink?',
    answer:
      'Add a drink to your cart and toggle “free drink” when you have credits available. The assistant cannot grant or redeem credits for you.',
  },
  {
    question: 'Can I reload my gift card in chat?',
    answer:
      'Gift card reloads, refunds, and billing issues must be completed in the payments tab. The assistant never handles transactions.',
  },
  {
    question: 'What if I need customer support?',
    answer:
      'Email our support team at the address provided in the assistant response so a human can help.',
  },
  {
    question: 'Does Coffee App deliver?',
    answer:
      'Orders are for in-store pickup today. Delivery isn’t available yet.',
  },
];

export const ASSISTANT_POLICIES = {
  guardrails:
    'Never offer free drinks, discounts, promo codes, refunds, credits, or perform any transaction on behalf of the user.',
  escalation:
    'When the user asks for customer service or something you cannot do, direct them to the provided support email without inventing new contact info.',
};
