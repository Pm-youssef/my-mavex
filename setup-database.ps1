Write-Host "🗄️ إعداد قاعدة البيانات PostgreSQL..." -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 تأكد من تثبيت Docker أولاً" -ForegroundColor Yellow
Write-Host "إذا لم يكن Docker مثبتاً، قم بتحميله من docker.com" -ForegroundColor White
Write-Host ""

Write-Host "🔍 فحص Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker يعمل بنجاح" -ForegroundColor Green
        Write-Host "   $dockerVersion" -ForegroundColor Gray
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "❌ Docker غير مثبت أو غير مشغل" -ForegroundColor Red
    Write-Host "يرجى تثبيت Docker وتشغيله أولاً" -ForegroundColor Yellow
    Read-Host "اضغط Enter للمتابعة"
    exit 1
}

Write-Host ""
Write-Host "🚀 تشغيل PostgreSQL..." -ForegroundColor Cyan

# لو الحاوية موجودة مسبقًا نحذفها
$containerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq "tshirt-db" }
if ($containerExists) {
    Write-Host "⚠️ الحاوية tshirt-db موجودة بالفعل، جاري حذفها..." -ForegroundColor Yellow
    docker rm -f tshirt-db | Out-Null
}

# إنشاء الحاوية من جديد
docker run --name tshirt-db --restart unless-stopped `
    -e POSTGRES_PASSWORD=password `
    -e POSTGRES_DB=tshirtstore `
    -p 5432:5432 -d postgres:15

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم تشغيل PostgreSQL بنجاح" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "⏳ انتظار بدء قاعدة البيانات..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "🗄️ إنشاء جداول قاعدة البيانات..." -ForegroundColor Cyan
    npx prisma db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم إنشاء الجداول بنجاح" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🌱 إضافة بيانات تجريبية..." -ForegroundColor Cyan
        npx prisma db seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم إضافة البيانات التجريبية بنجاح" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 قاعدة البيانات جاهزة الآن!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📱 يمكنك الآن تشغيل المشروع:" -ForegroundColor White
            Write-Host "npm run dev" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "🔐 لوحة الإدارة: http://localhost:3000/admin" -ForegroundColor White
            Write-Host "كلمة المرور: admin123" -ForegroundColor Cyan
        } else {
            Write-Host "❌ فشل في إضافة البيانات التجريبية" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ فشل في إنشاء الجداول" -ForegroundColor Red
    }
} else {
    Write-Host "❌ فشل في تشغيل PostgreSQL" -ForegroundColor Red
    Write-Host "تحقق من أن Docker يعمل وأن المنفذ 5432 متاح" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 أوامر مفيدة:" -ForegroundColor Yellow
Write-Host "- docker ps: عرض الحاويات العاملة" -ForegroundColor White
Write-Host "- docker logs tshirt-db: عرض سجلات قاعدة البيانات" -ForegroundColor White
Write-Host "- docker stop tshirt-db: إيقاف قاعدة البيانات" -ForegroundColor White
Write-Host "- docker start tshirt-db: تشغيل قاعدة البيانات" -ForegroundColor White
Write-Host ""

Read-Host "اضغط Enter للمتابعة"
