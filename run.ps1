# Run Career Assessment on Windows
# Usage: .\run.ps1  (development) or .\run.ps1 -Production

param(
    [switch]$Production  # If set, build and run production server (port 3000)
)

Set-Location $PSScriptRoot

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
if (-not (Test-Path node_modules)) {
    npm install
} else {
    npm install 2>$null
}

if ($Production) {
    Write-Host "==> Building..." -ForegroundColor Cyan
    npm run build
    Write-Host "==> Starting production server at http://localhost:3000" -ForegroundColor Green
    npm run start
} else {
    Write-Host "==> Starting dev server at http://localhost:3000" -ForegroundColor Green
    npm run dev
}
