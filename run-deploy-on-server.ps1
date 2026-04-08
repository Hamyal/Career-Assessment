# Run this in PowerShell. You will be asked for the server password (twice: for SCP and SSH).
# Deploys to 38.97.62.139 and starts the app.

$ErrorActionPreference = "Stop"
$Server = "38.97.62.139"
$User = "root"
$Dir = "career-assessment"
$proj = $PSScriptRoot
$ssh = "C:\Program Files\Git\usr\bin\ssh.exe"
$scp = "C:\Program Files\Git\usr\bin\scp.exe"
$tar = "C:\Program Files\Git\usr\bin\tar.exe"
$opts = @("-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30")

Write-Host "Deploying to ${User}@${Server}..." -ForegroundColor Cyan

# Ensure deploy.tar exists
Push-Location $proj
$items = @("src","public","package.json","package-lock.json","next.config.js","tsconfig.json","next-env.d.ts","ecosystem.config.cjs","jest.config.js",".env.server.example","scripts","supabase")
$existing = $items | Where-Object { Test-Path $_ }
& $tar -cf deploy.tar @existing
Pop-Location

Write-Host "`n1. Uploading files (enter server password when prompted)..."
& $ssh $opts "${User}@${Server}" "mkdir -p ~/$Dir"
& $scp $opts (Join-Path $proj "deploy.tar") "${User}@${Server}:~/${Dir}/"
& $scp $opts (Join-Path $proj ".env.local") "${User}@${Server}:~/${Dir}/.env.local"

Write-Host "`n2. On server: install, build, start (enter server password when prompted)..."
$cmd = "cd ~/$Dir && tar -xf deploy.tar && (command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs && sudo npm install -g pm2)) && npm install && npm run build && mkdir -p logs && (pm2 delete career-assessment 2>/dev/null; true) && pm2 start ecosystem.config.cjs && pm2 save && pm2 status && echo '' && echo '>>> App: http://${Server}:3000'"
& $ssh $opts "${User}@${Server}" $cmd

Write-Host "`nDone. Open: http://${Server}:3000" -ForegroundColor Green
