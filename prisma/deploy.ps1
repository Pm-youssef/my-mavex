# deploy.ps1 - سكربت رفع سريع إلى GitHub ومن ثم دفع الفرع main
# عدّل $remoteUrl لو حبيت توصل إلى ريبو آخر

# 0) مسار Git (محاولة استخدام التثبيت الافتراضي أولًا)
$GitExe = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $GitExe)) {
  $GitExe = "git"   # fall back to PATH
}

# 0.1) تحقق من الإصدار
Write-Host "Checking git version..."
try { & $GitExe --version } catch { Write-Host "Git not found. Install Git and retry."; exit 1 }

# 1) اجعل الفرع الافتراضي main عالمياً
& $GitExe config --global init.defaultBranch main

# 2) اتهيئة repo محليًا لو لم تكن مهيأ
if (-not (Test-Path ".git")) {
  Write-Host "Initializing local git repository..."
  & $GitExe init
} else {
  Write-Host ".git already exists, skipping git init."
}

# 3) تأكد من user.name و user.email (إذا لم يعملا سيسألك لتعدلهما)
$u = (& $GitExe config user.name) -join ""
$e = (& $GitExe config user.email) -join ""
if (-not $u) {
  Write-Host "Setting git global user.name (temporary placeholder)."
  & $GitExe config --global user.name "Your Name"
}
if (-not $e) {
  Write-Host "Setting git global user.email (temporary placeholder)."
  & $GitExe config --global user.email "email@example.com"
}

# 4) إضافة كل الملفات
Write-Host "Adding files..."
& $GitExe add -A

# 5) عمل commit (يتجاهل الخطأ لو لا تغييرات)
try {
  & $GitExe commit -m "chore: initial commit" 
} catch {
  Write-Host "No changes to commit or initial commit already exists."
}

# 6) توحيد اسم الفرع إلى main
& $GitExe branch -M main

# 7) رابط الريموت — تأكد أنه صحيح أو غيّره إذا لزم
$remoteUrl = "https://github.com/Pm-youssef/my-mavex.git"   # <-- هذا مضبوط لديك
$remotes = (& $GitExe remote) -split "`n"
if ($remotes -notcontains "origin") {
  Write-Host "Adding remote origin -> $remoteUrl"
  & $GitExe remote add origin $remoteUrl
} else {
  Write-Host "Setting origin URL -> $remoteUrl"
  & $GitExe remote set-url origin $remoteUrl
}

# 8) دفع إلى GitHub (push). سنحاول push واذا فشل سنجرب pull --rebase ثم push مجددًا
Write-Host "Pushing to origin main..."
try {
  & $GitExe push -u origin main
  Write-Host "Push succeeded."
} catch {
  Write-Host "Initial push failed. Trying pull --rebase then push..."
  try {
    & $GitExe pull --rebase origin main
    & $GitExe push -u origin main
    Write-Host "Push after rebase succeeded."
  } catch {
    Write-Host "Push still failed. Please check authentication or remote URL."
    exit 1
  }
}

Write-Host "Done. Check your repository on GitHub: $remoteUrl"
