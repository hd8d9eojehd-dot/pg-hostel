param(
    [Parameter(Mandatory=$true)]
    [string]$DbPassword
)

$ref = "cxvsvpsmkzgizggpajnw"
$dbUrl = "postgresql://postgres:${DbPassword}@db.${ref}.supabase.co:5432/postgres"

Write-Host ""
Write-Host "PG Hostel Platform - Final Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update .env
Write-Host "[1/4] Updating .env..." -ForegroundColor Yellow
$env_content = @"
DATABASE_URL="$dbUrl"
DIRECT_URL="$dbUrl"
NEXT_PUBLIC_SUPABASE_URL="https://cxvsvpsmkzgizggpajnw.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnN2cHNta3pnaXpnZ3Bham53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjc4NjUsImV4cCI6MjA5MjgwMzg2NX0.NXtkYtFycSzMe46IEngobUrewHuyKlfUzQd4gysiPk8"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnN2cHNta3pnaXpnZ3Bham53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIyNzg2NSwiZXhwIjoyMDkyODAzODY1fQ.noAn840DzqNTXV-hmkst1JDGSKOAtRMrcebM_DevWvQ"
SUPABASE_STORAGE_BUCKET_DOCS="student-documents"
SUPABASE_STORAGE_BUCKET_AVATARS="student-avatars"
SUPABASE_STORAGE_BUCKET_COMPLAINTS="complaint-photos"
PORT=4000
NODE_ENV=development
JWT_SECRET="pg-hostel-super-secret-jwt-key-minimum-32-chars!!"
ADMIN_PORTAL_URL="http://localhost:3000"
STUDENT_PORTAL_URL="http://localhost:3001"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
REDIS_URL="redis://localhost:6379"
WHATSAPP_SESSION_PATH="./whatsapp-session"
WHATSAPP_HEADLESS=true
CASHFREE_APP_ID="test_app_id"
CASHFREE_SECRET_KEY="test_secret_key"
CASHFREE_ENV="TEST"
CASHFREE_WEBHOOK_SECRET="test_webhook_secret_32chars_min!!"
PUPPETEER_EXECUTABLE_PATH=""
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=300
OTP_MAX_ATTEMPTS=3
TZ="Asia/Kolkata"
PG_NAME="Sunrise PG"
RECEIPT_BASE_URL="http://localhost:4000/api/v1/finance/receipts"
IDCARD_BASE_URL="http://localhost:4000/api/v1/students/id-card"
"@
$env_content | Set-Content .env
Copy-Item .env backend/.env -Force
Write-Host "   OK" -ForegroundColor Green

# Step 2: Push schema
Write-Host "[2/4] Pushing database schema to Supabase..." -ForegroundColor Yellow
Set-Location backend
$env:DATABASE_URL = $dbUrl
$env:DIRECT_URL = $dbUrl
$result = npx prisma db push --accept-data-loss 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK - All tables created" -ForegroundColor Green
} else {
    Write-Host "   ERROR: $result" -ForegroundColor Red
    Write-Host "   Check your password and try again" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Step 3: Seed
Write-Host "[3/4] Seeding sample data..." -ForegroundColor Yellow
$result = npx ts-node --transpile-only prisma/seed.ts 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK - Sample data created" -ForegroundColor Green
} else {
    Write-Host "   Note: $($result | Select-Object -Last 3)" -ForegroundColor Yellow
}
Set-Location ..

# Step 4: Start backend
Write-Host "[4/4] Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$PSScriptRoot\backend'; Write-Host 'Backend API - http://localhost:4000' -ForegroundColor Cyan; npx ts-node --transpile-only src/index.ts`"" -WindowStyle Normal
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  PLATFORM IS LIVE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin Portal:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Student Portal: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend API:    http://localhost:4000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login: admin@sunrise-pg.com / Admin@123456" -ForegroundColor Yellow
Write-Host ""

Start-Process "http://localhost:3000"
