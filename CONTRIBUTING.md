# المساهمة في المشروع

شكراً لاهتمامك بالمساهمة في متجر التيشيرتات! 🎉

## كيفية المساهمة

### 1. Fork المشروع

1. اذهب إلى صفحة المشروع على GitHub
2. اضغط على زر "Fork" في الأعلى
3. سيتم نسخ المشروع إلى حسابك

### 2. Clone المشروع

```bash
git clone https://github.com/YOUR_USERNAME/tshirt-store.git
cd tshirt-store
```

### 3. إعداد البيئة

```bash
# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp env.example .env.local

# تعديل ملف البيئة بمعلوماتك
```

### 4. إنشاء Branch جديد

```bash
git checkout -b feature/your-feature-name
```

### 5. إجراء التغييرات

- اكتب الكود
- اختبر التغييرات
- تأكد من عمل جميع الاختبارات

### 6. Commit التغييرات

```bash
git add .
git commit -m "feat: إضافة ميزة جديدة"
```

### 7. Push التغييرات

```bash
git push origin feature/your-feature-name
```

### 8. إنشاء Pull Request

1. اذهب إلى صفحة المشروع الأصلي
2. اضغط على "Compare & pull request"
3. اكتب وصفاً للتغييرات
4. اضغط "Create pull request"

## معايير الكود

### TypeScript

- استخدم TypeScript لجميع الملفات الجديدة
- حدد أنواع البيانات بوضوح
- تجنب استخدام `any` قدر الإمكان

### React/Next.js

- استخدم Functional Components
- استخدم Hooks بدلاً من Class Components
- اتبع قواعد Next.js 14 App Router

### Styling

- استخدم Tailwind CSS
- حافظ على التناسق في التصميم
- تأكد من التجاوب مع جميع الأجهزة

### قاعدة البيانات

- استخدم Prisma ORM
- اكتب migrations واضحة
- اختبر الاستعلامات

## هيكل المشروع

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API Routes
│   ├── components/     # React Components
│   └── lib/           # Utilities & Config
├── prisma/            # Database Schema
└── public/           # Static Assets
```

## الاختبار

قبل إرسال Pull Request:

1. تأكد من عمل المشروع محلياً
2. اختبر جميع الوظائف
3. تأكد من عدم وجود أخطاء في Console
4. اختبر على متصفحات مختلفة

## الإبلاغ عن الأخطاء

عند الإبلاغ عن خطأ:

1. اكتب وصفاً واضحاً للمشكلة
2. أضف خطوات لتكرار المشكلة
3. اذكر نظام التشغيل والمتصفح
4. أضف screenshots إذا لزم الأمر

## طلبات الميزات

عند طلب ميزة جديدة:

1. اكتب وصفاً مفصلاً للميزة
2. اشرح الفائدة منها
3. اقترح طريقة التنفيذ
4. أضف أمثلة أو mockups

## التواصل

لأي استفسارات:

- افتح Issue على GitHub
- اكتب تعليق على Pull Request
- تواصل مع المطورين

## شكراً لك! 🙏

شكراً لمساهمتك في تطوير هذا المشروع. كل مساهمة مهمة وتساعد في تحسين التجربة للجميع. 