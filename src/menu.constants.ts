export const MENU_CATEGORY_VALUES = ['COFFEE', 'PASTRY'] as const;

export type MenuCategory = (typeof MENU_CATEGORY_VALUES)[number];

export const isMenuCategory = (value: string): value is MenuCategory =>
  MENU_CATEGORY_VALUES.includes(value as MenuCategory);

export const normalizeMenuCategory = (value?: string): MenuCategory | undefined => {
  if (!value) {
    return undefined;
  }

  const candidate = value.toUpperCase();
  return isMenuCategory(candidate) ? (candidate as MenuCategory) : undefined;
};
