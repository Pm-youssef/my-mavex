Write-Host "🚀 بدء الإعداد السريع لمتجر التيشيرتات..." -ForegroundColor Green

Write-Host ""
Write-Host "📋 الخطوات المطلوبة:" -ForegroundColor Yellow
Write-Host "1. تأكد من تشغيل PostgreSQL على المنفذ 5432" -ForegroundColor White
Write-Host "2. تأكد من وجود قاعدة بيانات باسم 'tshirtstore'" -ForegroundColor White
Write-Host "3. تأكد من صحة DATABASE_URL في ملف .env.local" -ForegroundColor White
Write-Host ""

Write-Host "🗄️ إعداد قاعدة البيانات..." -ForegroundColor Cyan
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم إنشاء جداول قاعدة البيانات بنجاح!" -ForegroundColor Green
    
    Write-Host "🌱 إضافة بيانات تجريبية..." -ForegroundColor Cyan
    npx prisma db seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم إضافة البيانات التجريبية بنجاح!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 المشروع جاهز الآن!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 افتح المتصفح على: http://localhost:3000" -ForegroundColor White
        Write-Host "🔐 لوحة الإدارة: http://localhost:3000/admin (كلمة المرور: admin123)" -ForegroundColor White
    } else {
        Write-Host "❌ فشل في إضافة البيانات التجريبية" -ForegroundColor Red
        Write-Host "تحقق من قاعدة البيانات والمتغيرات البيئية" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ فشل في إنشاء جداول قاعدة البيانات" -ForegroundColor Red
    Write-Host "تحقق من اتصال قاعدة البيانات" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 أوامر مفيدة:" -ForegroundColor Yellow
Write-Host "- npm run dev: تشغيل التطوير" -ForegroundColor White
Write-Host "- npm run build: بناء للإنتاج" -ForegroundColor White
Write-Host "- npx prisma studio: فتح Prisma Studio" -ForegroundColor White
Write-Host ""

Read-Host "اضغط Enter للمتابعة"
