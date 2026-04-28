# PG Hostel Platform — Quick Start Script
# Run: .\start-portals.ps1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PG Hostel Management Platform              ║" -ForegroundColor Cyan
Write-Host "║   Starting Admin + Student Portals...        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Start Admin Portal in background
Write-Host "▶ Starting Admin Portal on http://localhost:3000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\admin-portal'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Student Portal in background
Write-Host "▶ Starting Student Portal on http://localhost:3001" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\student-portal'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ Portals starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin Portal:   http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Student Portal: http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  NOTE: To use the full platform with real data," -ForegroundColor Yellow
Write-Host "   you need to set up Supabase credentials in .env" -ForegroundColor Yellow
Write-Host "   See SETUP.md for complete instructions." -ForegroundColor Yellow
Write-Host ""

# Open browsers
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Start-Sleep -Seconds 1
Start-Process "http://localhost:3001"
