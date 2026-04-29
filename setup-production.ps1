#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
#  PG Hostel — Production Setup Script
#  Configures Redis (Upstash), WhatsApp, and Cashfree credentials
# ─────────────────────────────────────────────────────────────────────────────

param(
    [string]$RedisUrl      = "",
    [string]$CashfreeAppId = "",
    [string]$CashfreeSecret = "",
    [string]$CashfreeWebhookSecret = ""
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PG Hostel — Production Credentials Setup               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Redis ────────────────────────────────────────────────────────────
if (-not $RedisUrl) {
    Write-Host "STEP 1 — Redis (Upstash)" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://console.upstash.com" -ForegroundColor White
    Write-Host "  2. Sign up free → Create Database" -ForegroundColor White
    Write-Host "  3. Name: pg-hostel  |  Region: ap-southeast-1 (Singapore)" -ForegroundColor White
    Write-Host "  4. Click the database → scroll to 'Connect' section" -ForegroundColor White
    Write-Host "  5. Copy the 'Redis URL' (starts with rediss://)" -ForegroundColor White
    Write-Host ""
    $RedisUrl = Read-Host "  Paste your Upstash Redis URL here"
}

# ─── Step 2: Cashfree ─────────────────────────────────────────────────────────
if (-not $CashfreeAppId) {
    Write-Host ""
    Write-Host "STEP 2 — Cashfree Production Keys" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://merchant.cashfree.com" -ForegroundColor White
    Write-Host "  2. Login → Developers → API Keys" -ForegroundColor White
    Write-Host "  3. Switch to PRODUCTION tab" -ForegroundColor White
    Write-Host "  4. Copy App ID and Secret Key" -ForegroundColor White
    Write-Host "  5. For Webhook Secret: Developers → Webhooks → copy secret" -ForegroundColor White
    Write-Host ""
    $CashfreeAppId          = Read-Host "  Cashfree Production App ID"
    $CashfreeSecret         = Read-Host "  Cashfree Production Secret Key"
    $CashfreeWebhookSecret  = Read-Host "  Cashfree Webhook Secret (min 32 chars)"
}

# ─── Write .env files ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Writing credentials to .env files..." -ForegroundColor Green

$envContent = Get-Content ".env" -Raw

# Replace Redis
$envContent = $envContent -replace 'REDIS_URL="[^"]*"', "REDIS_URL=`"$RedisUrl`""

# Replace Cashfree
$envContent = $envContent -replace 'CASHFREE_APP_ID="[^"]*"',          "CASHFREE_APP_ID=`"$CashfreeAppId`""
$envContent = $envContent -replace 'CASHFREE_SECRET_KEY="[^"]*"',      "CASHFREE_SECRET_KEY=`"$CashfreeSecret`""
$envContent = $envContent -replace 'CASHFREE_ENV="[^"]*"',             'CASHFREE_ENV="PROD"'
$envContent = $envContent -replace 'CASHFREE_WEBHOOK_SECRET="[^"]*"',  "CASHFREE_WEBHOOK_SECRET=`"$CashfreeWebhookSecret`""

$envContent | Set-Content ".env" -Encoding UTF8
Copy-Item ".env" "backend/.env" -Force

Write-Host "  ✅ .env updated" -ForegroundColor Green
Write-Host "  ✅ backend/.env updated" -ForegroundColor Green

# ─── Step 3: WhatsApp ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 3 — WhatsApp" -ForegroundColor Yellow
Write-Host "  WhatsApp connects via QR scan — no API key needed." -ForegroundColor White
Write-Host "  After the backend starts, the QR code will appear:" -ForegroundColor White
Write-Host "    • In the backend terminal window" -ForegroundColor White
Write-Host "    • On the Admin Portal → WhatsApp page (auto-refreshes)" -ForegroundColor White
Write-Host ""
Write-Host "  To scan:" -ForegroundColor White
Write-Host "    1. Open WhatsApp on your phone" -ForegroundColor White
Write-Host "    2. Tap ⋮ Menu → Linked Devices → Link a Device" -ForegroundColor White
Write-Host "    3. Scan the QR code" -ForegroundColor White
Write-Host "    4. Session is saved — won't need to scan again unless logged out" -ForegroundColor White

# ─── Restart backend ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "All credentials saved! Restart the backend to apply changes:" -ForegroundColor Cyan
Write-Host "  Run: .\start-backend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Then open the Admin Portal → WhatsApp page to scan the QR code." -ForegroundColor White
Write-Host ""
