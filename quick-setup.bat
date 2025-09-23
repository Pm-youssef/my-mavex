@echo off
echo 🚀 بدء الإعداد السريع لمتجر التيشيرتات...

echo.
echo 📋 الخطوات المطلوبة:
echo 1. تأكد من تشغيل PostgreSQL على المنفذ 5432
echo 2. تأكد من وجود قاعدة بيانات باسم 'tshirtstore'
echo 3. تأكد من صحة DATABASE_URL في ملف .env.local
echo.

echo 🗄️ إعداد قاعدة البيانات...
npx prisma db push

if %errorlevel% equ 0 (
    echo ✅ تم إنشاء جداول قاعدة البيانات بنجاح!
    
    echo 🌱 إضافة بيانات تجريبية...
    npx prisma db seed
    
    if %errorlevel% equ 0 (
        echo ✅ تم إضافة البيانات التجريبية بنجاح!
        echo.
        echo 🎉 المشروع جاهز الآن!
        echo.
        echo 📱 افتح المتصفح على: http://localhost:3000
        echo 🔐 لوحة الإدارة: http://localhost:3000/admin (كلمة المرور: admin123)
    ) else (
        echo ❌ فشل في إضافة البيانات التجريبية
        echo تحقق من قاعدة البيانات والمتغيرات البيئية
    )
) else (
    echo ❌ فشل في إنشاء جداول قاعدة البيانات
    echo تحقق من اتصال قاعدة البيانات
)

echo.
echo 🔧 أوامر مفيدة:
echo - npm run dev: تشغيل التطوير
echo - npm run build: بناء للإنتاج
echo - npx prisma studio: فتح Prisma Studio
echo.

pause
