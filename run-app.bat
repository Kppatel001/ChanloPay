@echo off
REM ============================================================
REM  ChanloPay - Run the app locally (development server)
REM  Double-click this file to start ChanloPay on your PC.
REM  It opens at:  http://localhost:9002
REM ============================================================

cd /d "%~dp0"
title ChanloPay - Dev Server

echo.
echo ============================================
echo   Starting ChanloPay
echo ============================================
echo.

REM 1) Check Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed.
  echo     Please install it from https://nodejs.org  ^(LTS version^), then run this again.
  echo.
  pause
  exit /b 1
)

REM 2) Install dependencies on first run
if not exist "node_modules" (
  echo First run detected - installing dependencies.
  echo This can take a few minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [X] npm install failed. Scroll up to read the error.
    pause
    exit /b 1
  )
)

echo.
echo Launching the dev server...
echo When you see "Ready", open your browser at:  http://localhost:9002
echo (Opening it for you now - if the page is blank, wait a few seconds and refresh.)
echo.

REM Open the browser, then start the server (which keeps running in this window)
start "" http://localhost:9002
call npm run dev

echo.
echo The dev server has stopped.
pause
