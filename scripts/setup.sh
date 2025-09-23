#!/bin/bash

echo "🚀 بدء إعداد متجر التيشيرتات..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js 18+ أولاً"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ يرجى استخدام Node.js 18+ أو أحدث"
    exit 1
fi

echo "✅ Node.js مثبت بنجاح"

# Install dependencies
echo "📦 تثبيت التبعيات..."
npm install

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📝 نسخ ملف البيئة..."
    cp env.example .env.local
    echo "⚠️  يرجى تعديل ملف .env.local بمعلوماتك"
fi

# Generate Prisma client
echo "🗄️  إعداد قاعدة البيانات..."
npx prisma generate

echo "✅ تم الإعداد بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. عدّل ملف .env.local بمعلوماتك"
echo "2. شغل: npm run dev"
echo "3. افتح: http://localhost:3000"
echo ""
echo "🔧 أوامر مفيدة:"
echo "- npm run dev: تشغيل التطوير"
echo "- npm run build: بناء للإنتاج"
echo "- npm run db:seed: إضافة بيانات تجريبية"
echo "- npm run db:studio: فتح Prisma Studio" 