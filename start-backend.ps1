# PG Hostel Platform — Backend Start Script
# Requires: Supabase credentials in .env
# Run: .\start-backend.ps1

Write-Host ""
Write-Host "▶ Starting Backend API on http://localhost:4000" -ForegroundColor Green
Write-Host "  Health check: http://localhost:4000/health" -ForegroundColor Gray
Write-Host ""

Set-Location "$PSScriptRoot\backend"
Copy-Item "..\\.env" ".env" -Force 2>$null
npx ts-node --transpile-only src/index.ts
