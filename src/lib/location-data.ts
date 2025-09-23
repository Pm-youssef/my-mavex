export interface LocationData {
  id: string;
  name: string;
  cities?: string[];
}

export const egyptGovernorates: LocationData[] = [
  {
    id: 'cairo',
    name: 'القاهرة',
    cities: [
      'القاهرة الجديدة',
      'مدينة نصر',
      'المعادي',
      'مصر الجديدة',
      'الزمالك',
      'جاردن سيتي',
      'وسط البلد',
    ],
  },
  {
    id: 'giza',
    name: 'الجيزة',
    cities: [
      'الدقي',
      'المهندسين',
      'الهرم',
      '6 أكتوبر',
      'الشيخ زايد',
      'الوراق',
      'إمبابة',
    ],
  },
  {
    id: 'alexandria',
    name: 'الإسكندرية',
    cities: [
      'سموحة',
      'سيدي جابر',
      'ميامي',
      'ستانلي',
      'سيدي بشر',
      'العجمي',
      'باكوس',
    ],
  },
  {
    id: 'sharqia',
    name: 'الشرقية',
    cities: [
      'الزقازيق',
      'العاشر من رمضان',
      'بلبيس',
      'أبو كبير',
      'فاقوس',
      'ههيا',
    ],
  },
  {
    id: 'gharbia',
    name: 'الغربية',
    cities: ['طنطا', 'المحلة الكبرى', 'زفتى', 'سمنود', 'كفر الزيات', 'بسيون'],
  },
  {
    id: 'menoufia',
    name: 'المنوفية',
    cities: ['شبين الكوم', 'سادات سيتي', 'تلا', 'أشمون', 'الباجور', 'قويسنا'],
  },
  {
    id: 'qalyubia',
    name: 'القليوبية',
    cities: [
      'بنها',
      'شبرا الخيمة',
      'القناطر الخيرية',
      'الخانكة',
      'كفر شكر',
      'طوخ',
    ],
  },
  {
    id: 'beheira',
    name: 'البحيرة',
    cities: ['دمنهور', 'رشيد', 'إدكو', 'أبو المطامير', 'الدلنجات', 'كوم حمادة'],
  },
  {
    id: 'ismailia',
    name: 'الإسماعيلية',
    cities: [
      'الإسماعيلية',
      'فايد',
      'القنطرة شرق',
      'القنطرة غرب',
      'التل الكبير',
      'أبو صوير',
    ],
  },
  {
    id: 'port-said',
    name: 'بورسعيد',
    cities: ['بورسعيد', 'بورفؤاد', 'العرب', 'المناخ', 'الضواحي'],
  },
  {
    id: 'suez',
    name: 'السويس',
    cities: ['السويس', 'الأربعين', 'فايد', 'الجناين', 'عتاقة'],
  },
  {
    id: 'assiut',
    name: 'أسيوط',
    cities: ['أسيوط', 'ديروط', 'منفلوط', 'أبنوب', 'أبو تيج', 'ساحل سليم'],
  },
  {
    id: 'sohag',
    name: 'سوهاج',
    cities: ['سوهاج', 'أخميم', 'البلينا', 'مرسى', 'المنشأة', 'طهطا'],
  },
  {
    id: 'qena',
    name: 'قنا',
    cities: ['قنا', 'الأقصر', 'إسنا', 'دشنا', 'نجع حمادي', 'قفط'],
  },
  {
    id: 'aswan',
    name: 'أسوان',
    cities: ['أسوان', 'كوم أمبو', 'إدفو', 'دراو', 'نصر النوبة', 'كلابشة'],
  },
];

export const getCitiesByGovernorate = (governorateId: string): string[] => {
  const governorate = egyptGovernorates.find(g => g.id === governorateId);
  return governorate?.cities || [];
};

export const shippingMethods = [
  {
    id: 'STANDARD',
    name: 'الشحن القياسي',
    description: '3-5 أيام عمل',
    price: 75,
  },
  {
    id: 'EXPRESS',
    name: 'الشحن السريع',
    description: '1-2 أيام عمل',
    price: 150,
  },
];

export const paymentMethods = [
  {
    id: 'COD',
    name: 'الدفع عند الاستلام',
    description: 'ادفع نقداً عند استلام طلبك',
    icon: '💵',
  },
  {
    id: 'CARD',
    name: 'بطاقة ائتمان',
    description: 'ادفع ببطاقة الائتمان أو الخصم',
    icon: '💳',
  },
];
