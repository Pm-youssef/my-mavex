import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  // Create sample products
  const products = [
    {
      name: 'berserker',
      description: 'تيشيرت قطني 100% أسود كلاسيك، مريح ومناسب لجميع المناسبات',
      originalPrice: 900.0,
      discountedPrice: 640.0,
      imageUrl:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
      stock: 50,
      variants: [
        { size: 'S', stock: 10, minDisplayStock: 5 },
        { size: 'M', stock: 20, minDisplayStock: 5 },
        { size: 'L', stock: 15, minDisplayStock: 5 },
        { size: 'XL', stock: 8, minDisplayStock: 5 },
        { size: 'XXL', stock: 5, minDisplayStock: 5 },
      ],
    },
    {
      name: 'empire',
      description: 'تيشيرت أسود أنيق من القطن العضوي، تصميم بسيط وأنيق',
      originalPrice: 750.0,
      discountedPrice: 599.0,
      imageUrl:
        'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=500&fit=crop',
      stock: 30,
      variants: [
        { size: 'S', stock: 8, minDisplayStock: 5 },
        { size: 'M', stock: 12, minDisplayStock: 5 },
        { size: 'L', stock: 10, minDisplayStock: 5 },
        { size: 'XL', stock: 6, minDisplayStock: 5 },
        { size: 'XXL', stock: 4, minDisplayStock: 5 },
      ],
    },
    {
      name: 'warrior',
      description: 'تيشيرت رياضي ملون، مثالي للرياضة والأنشطة اليومية',
      originalPrice: 850.0,
      discountedPrice: 680.0,
      imageUrl:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&h=500&fit=crop',
      stock: 25,
      variants: [
        { size: 'S', stock: 6, minDisplayStock: 5 },
        { size: 'M', stock: 10, minDisplayStock: 5 },
        { size: 'L', stock: 8, minDisplayStock: 5 },
        { size: 'XL', stock: 5, minDisplayStock: 5 },
        { size: 'XXL', stock: 3, minDisplayStock: 5 },
      ],
    },
  ];

  for (const productData of products) {
    const { variants, ...product } = productData;

    const createdProduct = await prisma.product.create({
      data: product,
    });

    // Create variants for this product
    for (const variant of variants) {
      await prisma.productVariant.create({
        data: {
          ...variant,
          productId: createdProduct.id,
        },
      });
    }
  }

  console.log('✅ Sample products with variants created successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
