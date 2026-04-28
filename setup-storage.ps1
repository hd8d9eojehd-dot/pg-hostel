# Creates Supabase storage buckets
# Run AFTER setup-and-run.ps1

$ServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnN2cHNta3pnaXpnZ3Bham53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIyNzg2NSwiZXhwIjoyMDkyODAzODY1fQ.noAn840DzqNTXV-hmkst1JDGSKOAtRMrcebM_DevWvQ"
$SupabaseUrl = "https://cxvsvpsmkzgizggpajnw.supabase.co"
$Headers = @{ "Authorization" = "Bearer $ServiceKey"; "Content-Type" = "application/json" }

$Buckets = @(
    @{ name = "student-documents"; public = $false },
    @{ name = "student-avatars"; public = $true },
    @{ name = "complaint-photos"; public = $false }
)

Write-Host "Creating Supabase storage buckets..." -ForegroundColor Yellow

foreach ($bucket in $Buckets) {
    $body = @{ id = $bucket.name; name = $bucket.name; public = $bucket.public } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$SupabaseUrl/storage/v1/bucket" -Method POST -Headers $Headers -Body $body
        Write-Host "  ✓ Created bucket: $($bucket.name)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "  ✓ Bucket already exists: $($bucket.name)" -ForegroundColor Gray
        } else {
            Write-Host "  ✗ Failed: $($bucket.name) — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✅ Storage setup complete!" -ForegroundColor Green
