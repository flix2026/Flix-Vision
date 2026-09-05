@echo off
title FLIX Vision - Local Server

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download it from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Move to the directory where this bat file lives (handles shortcuts etc.)
cd /d "%~dp0"

echo.
echo  Starting FLIX Vision server...
echo.

:: Launch server and open browser after a short delay
start "" /b cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:8080"
node server.js

:: If node exits (Ctrl+C or crash), pause so the window stays open
echo.
echo  Server stopped.
pause
