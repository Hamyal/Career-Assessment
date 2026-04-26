# Run Career Assessment on Windows
# Usage: .\run.ps1  (development) or .\run.ps1 -Production

param(
    [switch]$Production  # If set, build and run production server (port 3000)
)

Set-Location $PSScriptRoot

function Get-LocalLanIps {
    try {
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -and $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
            Select-Object -ExpandProperty IPAddress -Unique
        if ($ips) { return $ips }
    } catch {}
    return @()
}

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
if (-not (Test-Path node_modules)) {
    npm install
} else {
    npm install 2>$null
}

$lanIps = Get-LocalLanIps
if ($lanIps.Count -gt 0) {
    Write-Host "==> Mobile/LAN URL(s):" -ForegroundColor Cyan
    foreach ($ip in $lanIps) {
        Write-Host "    http://$ip`:3000" -ForegroundColor Green
    }
    Write-Host "    (Make sure your phone is on the same Wi‑Fi)" -ForegroundColor DarkGray
}

if ($Production) {
    Write-Host "==> Building..." -ForegroundColor Cyan
    npm run build
    Write-Host "==> Starting production server (LAN enabled) on port 3000" -ForegroundColor Green
    npm run start
} else {
    Write-Host "==> Starting dev server (LAN enabled) on port 3000" -ForegroundColor Green
    npm run dev:server
}
