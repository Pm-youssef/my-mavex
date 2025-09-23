@echo off
echo 🗄️ إعداد قاعدة البيانات PostgreSQL...

echo.
echo 📋 تأكد من تثبيت Docker أولاً
echo إذا لم يكن Docker مثبتاً، قم بتحميله من docker.com
echo.

echo 🔍 فحص Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker غير مثبت أو غير مشغل
    echo يرجى تثبيت Docker وتشغيله أولاً
    pause
    exit /b 1
)

echo ✅ Docker يعمل بنجاح

echo.
echo 🚀 تشغيل PostgreSQL...
docker run --name tshirt-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tshirtstore -p 5432:5432 -d postgres:15

if %errorlevel% equ 0 (
    echo ✅ تم تشغيل PostgreSQL بنجاح
    
    echo.
    echo ⏳ انتظار بدء قاعدة البيانات...
    timeout /t 10 /nobreak >nul
    
    echo.
    echo 🗄️ إنشاء جداول قاعدة البيانات...
    npx prisma db push
    
    if %errorlevel% equ 0 (
        echo ✅ تم إنشاء الجداول بنجاح
        
        echo.
        echo 🌱 إضافة بيانات تجريبية...
        npx prisma db seed
        
        if %errorlevel% equ 0 (
            echo ✅ تم إضافة البيانات التجريبية بنجاح
            echo.
            echo 🎉 قاعدة البيانات جاهزة الآن!
            echo.
            echo 📱 يمكنك الآن تشغيل المشروع:
            echo npm run dev
            echo.
            echo 🔐 لوحة الإدارة: http://localhost:3000/admin
            echo كلمة المرور: admin123
        ) else (
            echo ❌ فشل في إضافة البيانات التجريبية
        )
    ) else (
        echo ❌ فشل في إنشاء الجداول
    )
) else (
    echo ❌ فشل في تشغيل PostgreSQL
    echo تحقق من أن Docker يعمل وأن المنفذ 5432 متاح
)

echo.
echo 🔧 أوامر مفيدة:
echo - docker ps: عرض الحاويات العاملة
echo - docker logs tshirt-db: عرض سجلات قاعدة البيانات
echo - docker stop tshirt-db: إيقاف قاعدة البيانات
echo - docker start tshirt-db: تشغيل قاعدة البيانات
echo.

pause
