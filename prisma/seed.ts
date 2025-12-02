import { MenuCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedMenuItem = {
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageKey: string;
  tags: string[];
};

const menuItems: SeedMenuItem[] = [
  {
    name: 'Classic Espresso',
    description: 'Double-shot espresso pulled from freshly roasted beans for a bold start.',
    price: 3.5,
    category: MenuCategory.COFFEE,
    imageKey: 'espresso-classic',
    tags: ['2oz', 'Bold'],
  },
  {
    name: 'Iced Oat Latte',
    description: 'House espresso shaken with vanilla syrup and chilled oat milk over ice.',
    price: 5.75,
    category: MenuCategory.COFFEE,
    imageKey: 'iced-oat-latte',
    tags: ['Non dairy', '12oz'],
  },
  {
    name: 'Maple Cold Foam',
    description: 'Slow-steeped cold brew finished with maple sweet cream cold foam.',
    price: 6.5,
    category: MenuCategory.COFFEE,
    imageKey: 'maple-cold-foam',
    tags: ['Seasonal'],
  },
  {
    name: 'Mocha Delight',
    description: 'Silky chocolate sauce, steamed milk, and espresso finished with cocoa.',
    price: 5.95,
    category: MenuCategory.COFFEE,
    imageKey: 'mocha-delight',
    tags: ['Customer favorite'],
  },
  {
    name: 'Lemon Poppy Muffin',
    description: 'Bakery muffin baked daily with candied lemon peel and crunchy sugar top.',
    price: 3.95,
    category: MenuCategory.PASTRY,
    imageKey: 'lemon-poppy-muffin',
    tags: ['Vegetarian'],
  },
  {
    name: 'Almond Croissant',
    description: 'Buttery laminated dough filled with almond creme and toasted flakes.',
    price: 4.75,
    category: MenuCategory.PASTRY,
    imageKey: 'almond-croissant',
    tags: ['Best seller'],
  },
  {
    name: 'Blueberry Scone',
    description: 'Hand-folded scone studded with blueberries and finished with a vanilla glaze.',
    price: 3.25,
    category: MenuCategory.PASTRY,
    imageKey: 'blueberry-scone',
    tags: ['Pairs with tea'],
  },
  {
    name: 'Warm Cinnamon Roll',
    description: 'Fluffy roll baked with cinnamon sugar and slathered in cream cheese icing.',
    price: 4.25,
    category: MenuCategory.PASTRY,
    imageKey: 'cinnamon-roll',
    tags: ['Served warm'],
  },
];

async function main() {
  console.log('Clearing existing menu and cart items…');
  await prisma.cartItem.deleteMany();
  await prisma.menuItem.deleteMany();

  console.log('Seeding menu items…');
  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        ...item,
        price: item.price,
      },
    });
  }

  console.log(`Inserted ${menuItems.length} menu items ✅`);
}

main()
  .catch((error) => {
    console.error('Failed to seed database', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
