param(
    [Parameter(Mandatory=$true)]
    [string]$DbPassword
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PG Hostel Platform — Full Setup & Run              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ProjectRef = "cxvsvpsmkzgizggpajnw"
$DbUrl = "postgresql://postgres:$DbPassword@db.$ProjectRef.supabase.co:5432/postgres"

# Update .env with real DB password
Write-Host "1. Updating .env with database credentials..." -ForegroundColor Yellow
(Get-Content .env) -replace '\[YOUR-DB-PASSWORD\]', $DbPassword | Set-Content .env
Copy-Item .env backend/.env -Force
Write-Host "   ✓ .env updated" -ForegroundColor Green

# Push schema to Supabase
Write-Host ""
Write-Host "2. Pushing database schema to Supabase..." -ForegroundColor Yellow
Set-Location backend
$env:DATABASE_URL = $DbUrl
$env:DIRECT_URL = $DbUrl
npx prisma db push --accept-data-loss 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Schema pushed successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ Schema push failed — check your DB password" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Seed database
Write-Host ""
Write-Host "3. Seeding database with sample data..." -ForegroundColor Yellow
npx ts-node --transpile-only prisma/seed.ts 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Database seeded" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Seed may have partially failed (ok if already seeded)" -ForegroundColor Yellow
}

Set-Location ..

# Start backend
Write-Host ""
Write-Host "4. Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; Write-Host 'Backend starting...' -ForegroundColor Cyan; npx ts-node --transpile-only src/index.ts" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "   ✓ Backend starting on http://localhost:4000" -ForegroundColor Green

# Start portals (if not already running)
Write-Host ""
Write-Host "5. Starting Admin Portal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\admin-portal'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "6. Starting Student Portal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\student-portal'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ PLATFORM IS RUNNING!                            ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║   Admin Portal:   http://localhost:3000              ║" -ForegroundColor Green
Write-Host "║   Student Portal: http://localhost:3001              ║" -ForegroundColor Green
Write-Host "║   Backend API:    http://localhost:4000/health       ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║   Admin Login:  admin@sunrise-pg.com                 ║" -ForegroundColor Green
Write-Host "║   Password:     Admin@123456                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open browsers
Start-Process "http://localhost:3000"
Start-Sleep -Seconds 1
Start-Process "http://localhost:3001"
