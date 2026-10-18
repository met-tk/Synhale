@echo off
title Synhale 2 - Acoustic Synthesizer
cd /d "%~dp0"

echo ========================================================
echo   Synhale 2 - Acoustic Synthesizer Launcher
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 goto NO_NODE

:: 2. Check npm
where npm >nul 2>nul
if errorlevel 1 goto NO_NPM

:: 3. Check node_modules
if not exist node_modules goto INSTALL_DEPS

:START_APP
echo [OK] Environment verified.
echo [Info] Launching Synhale 2 on http://127.0.0.1:3000/ ...
echo.

:: Open browser in background
start "" "http://127.0.0.1:3000/"

:: Start Vite dev server
call npm run dev
if errorlevel 1 goto SERVER_ERROR
goto EXIT

:INSTALL_DEPS
echo [Info] Installing dependencies (npm install)...
call npm install
if errorlevel 1 goto INSTALL_ERROR
goto START_APP

:NO_NODE
echo.
echo [ERROR] Node.js is not installed or not in system PATH!
echo Please install Node.js (LTS version) from: https://nodejs.org/
echo.
pause
exit /b 1

:NO_NPM
echo.
echo [ERROR] npm is not found in system PATH!
echo Please check your Node.js installation.
echo.
pause
exit /b 1

:INSTALL_ERROR
echo.
echo [ERROR] Failed to install dependencies!
echo Please check your network connection and run 'npm install' manually.
echo.
pause
exit /b 1

:SERVER_ERROR
echo.
echo [Warning] Server exited with error code %errorlevel%.
pause
exit /b 1

:EXIT
