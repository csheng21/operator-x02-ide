@echo off
title Operator X02 - Tauri Build
cd /d "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI"
echo ========================================
echo   Building Operator X02 IDE...
echo ========================================
echo.
npm run tauri build
echo.
if %errorlevel% neq 0 (
    echo [ERROR] Build failed with code %errorlevel%
) else (
    echo [SUCCESS] Build completed!
)
echo.
pause
