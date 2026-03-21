@echo off
echo Starting Tauri Development Server...
echo.

cd /d "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI"

if %errorlevel% neq 0 (
    echo Error: Could not navigate to the project directory
    pause
    exit /b %errorlevel%
)

echo Running npm run tauri dev...
echo.

npm run tauri dev

pause
