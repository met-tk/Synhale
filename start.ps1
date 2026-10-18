# ========================================================
# Synhale 2 - PowerShell Launcher
# ========================================================
$Host.UI.RawUI.WindowTitle = "Synhale 2 - Acoustic Synthesizer"
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Synhale 2 - Acoustic Synthesizer Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js (LTS version): https://nodejs.org/"
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not found in PATH!" -ForegroundColor Red
    Write-Host "Please check your Node.js installation."
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}

# 3. Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[Info] Installing dependencies (npm install)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[OK] Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# 4. Launch browser
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:3000/"
} | Out-Null

Write-Host "[OK] Environment verified." -ForegroundColor Green
Write-Host "[Info] Starting Synhale 2 on http://127.0.0.1:3000/ ..." -ForegroundColor Green
Write-Host "[Info] Opening browser..." -ForegroundColor Gray
Write-Host ""

# 5. Start dev server
npm run dev
