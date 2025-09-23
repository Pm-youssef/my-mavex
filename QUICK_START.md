# 🚀 بدء سريع - متجر التيشيرتات

## ⚡ الإعداد في 5 دقائق

### 1. تشغيل قاعدة البيانات PostgreSQL

#### باستخدام Docker (الأسهل):
```bash
# تشغيل PostgreSQL
docker run --name tshirt-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tshirtstore -p 5432:5432 -d postgres:15

# أو استخدام docker-compose
docker-compose -f docker-compose.simple.yml up -d
```

#### بدون Docker:
- قم بتثبيت PostgreSQL من [postgresql.org](https://postgresql.org)
- أنشئ قاعدة بيانات باسم `tshirtstore`
- تأكد من تشغيل الخدمة على المنفذ 5432

### 2. إعداد قاعدة البيانات
```bash
# إنشاء الجداول
npx prisma db push

# إضافة بيانات تجريبية
npx prisma db seed
```

### 3. تشغيل المشروع
```bash
npm run dev
```

### 4. فتح المتصفح
- **الرئيسية**: http://localhost:3000
- **لوحة الإدارة**: http://localhost:3000/admin (كلمة المرور: admin123)

## 🔑 معلومات مهمة

- **كلمة مرور الإدارة**: `admin123`
- **قاعدة البيانات**: PostgreSQL على المنفذ 5432
- **اسم قاعدة البيانات**: `tshirtstore`
- **المستخدم**: `postgres`
- **كلمة المرور**: `password`

## 🛠️ أوامر مفيدة

```bash
npm run dev          # تشغيل التطوير
npm run build        # بناء للإنتاج
npm run start        # تشغيل الإنتاج
npx prisma studio    # فتح Prisma Studio
npx prisma db push   # تحديث قاعدة البيانات
npx prisma db seed   # إضافة بيانات تجريبية
```

## 📱 الميزات المتاحة

- ✅ عرض المنتجات
- ✅ سلة التسوق
- ✅ إدارة المنتجات
- ✅ نظام الدفع (Paymob)
- ✅ تصميم متجاوب
- ✅ دعم اللغة العربية

## 🚨 استكشاف الأخطاء

### مشكلة في قاعدة البيانات:
```bash
# تأكد من تشغيل PostgreSQL
docker ps | grep postgres

# أو تحقق من الخدمة
netstat -an | findstr 5432
```

### مشكلة في التبعيات:
```bash
rm -rf node_modules package-lock.json
npm install
```

### مشكلة في المتغيرات البيئية:
- تأكد من وجود ملف `.env.local`
- تحقق من صحة `DATABASE_URL`

## 🎯 الخطوات التالية

1. **إعداد Paymob** للحصول على مفاتيح API
2. **إعداد Supabase** (اختياري)
3. **تخصيص التصميم** والألوان
4. **إضافة منتجات** عبر لوحة الإدارة
5. **اختبار جميع الميزات**

---

**🎊 تهانينا! المشروع يعمل الآن!**
