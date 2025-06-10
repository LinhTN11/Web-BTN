# Test deployment script for Windows
Write-Host "🚀 Testing deployment setup..." -ForegroundColor Green

# Check if required files exist
Write-Host "📁 Checking required files..." -ForegroundColor Yellow

$files = @(
    "frontend/vercel.json",
    "frontend/.env.production", 
    "backend/render.yaml",
    "backend/.env",
    "DEPLOYMENT.md",
    "QUICK_DEPLOY.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# Test backend
Write-Host ""
Write-Host "🔧 Testing backend..." -ForegroundColor Yellow
Set-Location backend

try {
    npm install --silent
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend dependencies failed" -ForegroundColor Red
}

try {
    npm run build --silent
    Write-Host "✅ Backend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
}

# Test frontend
Write-Host ""
Write-Host "🔧 Testing frontend..." -ForegroundColor Yellow
Set-Location ../frontend

try {
    npm install --silent
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend dependencies failed" -ForegroundColor Red
}

try {
    npm run build --silent
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
}

Set-Location ..

Write-Host ""
Write-Host "🎉 Deployment test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Push code to GitHub" -ForegroundColor White
Write-Host "2. Follow QUICK_DEPLOY.md instructions" -ForegroundColor White
Write-Host "3. Deploy backend to Render" -ForegroundColor White
Write-Host "4. Deploy frontend to Vercel" -ForegroundColor White
