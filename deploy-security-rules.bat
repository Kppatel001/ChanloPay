@echo off
REM ============================================================
REM  ChanloPay - Deploy Firestore + Storage security rules
REM  Double-click this file (or run it from a terminal) to push
REM  the hardened firestore.rules and storage.rules to Firebase.
REM ============================================================

echo.
echo ==== ChanloPay security rules deploy ====
echo.

REM Ensure the Firebase CLI is installed.
where firebase >nul 2>nul
if errorlevel 1 (
  echo [!] Firebase CLI not found. Installing it globally via npm...
  call npm install -g firebase-tools
)

echo.
echo Checking Firebase login...
call firebase login

echo.
echo Deploying Firestore + Storage rules to project studio-2366361300-1c585 ...
call firebase deploy --only firestore:rules,storage --project studio-2366361300-1c585

echo.
echo ==== Done. Review the output above for success/errors. ====
pause
