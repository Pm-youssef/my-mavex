@echo off
echo 🚀 بدء إعداد متجر التيشيرتات...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت. يرجى تثبيت Node.js 18+ أولاً
    pause
    exit /b 1
)

echo ✅ Node.js مثبت بنجاح

REM Install dependencies
echo 📦 تثبيت التبعيات...
npm install

REM Copy environment file
if not exist .env.local (
    echo 📝 نسخ ملف البيئة...
    copy env.example .env.local
    echo ⚠️  يرجى تعديل ملف .env.local بمعلوماتك
)

REM Generate Prisma client
echo 🗄️  إعداد قاعدة البيانات...
npx prisma generate

echo ✅ تم الإعداد بنجاح!
echo.
echo 📋 الخطوات التالية:
echo 1. عدّل ملف .env.local بمعلوماتك
echo 2. شغل: npm run dev
echo 3. افتح: http://localhost:3000
echo.
echo 🔧 أوامر مفيدة:
echo - npm run dev: تشغيل التطوير
echo - npm run build: بناء للإنتاج
echo - npm run db:seed: إضافة بيانات تجريبية
echo - npm run db:studio: فتح Prisma Studio

pause 