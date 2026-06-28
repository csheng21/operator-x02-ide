@echo off
echo ========================================
echo Creating my-project
echo Type: react-app
echo ========================================
echo.

REM ============================================
REM Project Requirements
REM ============================================
REM ============================================
echo.

REM Create project directory
echo [1/8] Creating project folder...
mkdir "my-project"
if %errorlevel% neq 0 (
    echo ERROR: Could not create project folder!
    pause
    exit /b 1
)
cd "my-project"
echo     ✓ Project folder created

REM Create folder structure
echo [2/8] Creating folder structure...
mkdir "src" 2>nul
mkdir "src\components" 2>nul
mkdir "src\hooks" 2>nul
mkdir "src\utils" 2>nul
mkdir "src\styles" 2>nul
mkdir "src\assets" 2>nul
mkdir "public" 2>nul
echo     ✓ Folder structure created

REM Create package.json
echo [3/8] Creating package.json...
(
  echo {
  echo   \"name\": \"my-project\",
  echo   \"version\": \"0.1.0\",
  echo   \"private\": true,
  echo   \"type\": \"module\",
  echo   \"scripts\": {
  echo     \"dev\": \"vite\",
  echo     \"build\": \"vite build\",
  echo     \"preview\": \"vite preview\"
  echo   },
  echo   \"dependencies\": {
  echo     \"react\": \"^18.3.1\",
  echo     \"react-dom\": \"^18.3.1\"
  echo   },
  echo   \"devDependencies\": {
  echo     \"@vitejs/plugin-react\": \"^4.3.1\",
  echo     \"vite\": \"^5.4.2\"
  echo   }
  echo }
) > "package.json"
echo     ✓ package.json created

REM Create README.md with requirements
echo [4/8] Creating README.md...
(
  echo # my-project
  echo .
  echo A react-app project.
  echo .
  echo ## 🚀 Getting Started
  echo .
  echo \`\`\`bash
  echo npm install
  echo npm run dev
  echo \`\`\`
  echo .
  echo ## 📜 Available Scripts
  echo .
  echo - \`npm run dev\` - Start development server
  echo - \`npm run build\` - Build for production
  echo - \`npm run preview\` - Preview production build
  echo .
  echo ## 📁 Project Structure
  echo .
  echo \`\`\`
  echo my-project/
  echo ├── src/              # Source files
  echo ├── public/           # Static assets
  echo └── package.json      # Dependencies
  echo \`\`\`
  echo .
  echo ---
  echo Created with AI Code IDE
  echo .
) > "README.md"
echo     ✓ README.md created

REM Create .gitignore
echo [5/8] Creating .gitignore...
(
  echo node_modules/
  echo .env
  echo .env.local
  echo dist/
  echo build/
  echo .DS_Store
  echo *.log
  echo .
) > ".gitignore"
echo     ✓ .gitignore created

REM Create starter files
echo [6/8] Creating starter files...
(
  echo ^<!DOCTYPE html^>
  echo ^<html lang="en"^>
  echo ^<head^>
  echo   ^<meta charset="UTF-8"^>
  echo   ^<title^>my-project^</title^>
  echo ^</head^>
  echo ^<body^>
  echo   ^<div id="root"^>^</div^>
  echo   ^<script type="module" src="/src/main.jsx"^>^</script^>
  echo ^</body^>
  echo ^</html^>
) > "index.html"

(
  echo import { defineConfig } from 'vite'
  echo import react from '@vitejs/plugin-react'
  echo.
  echo export default defineConfig({
  echo   plugins: [react^(^)],
  echo }^)
) > "vite.config.js"

(
  echo import React from 'react'
  echo import ReactDOM from 'react-dom/client'
  echo import App from './App.jsx'
  echo.
  echo ReactDOM.createRoot^(document.getElementById^('root'^)^).render^(
  echo   ^<React.StrictMode^>
  echo     ^<App /^>
  echo   ^</React.StrictMode^>,
  echo ^)
) > "src\main.jsx"

(
  echo import { useState } from 'react'
  echo.
  echo function App^(^) {
  echo   const [count, setCount] = useState^(0^)
  echo.
  echo   return ^(
  echo     ^<div^>
  echo       ^<h1^>my-project^</h1^>
  echo       ^<button onClick={^(^) =^> setCount^(count + 1^)}^>
  echo         Count: {count}
  echo       ^</button^>
  echo     ^</div^>
  echo   ^)
  echo }
  echo.
  echo export default App
) > "src\App.jsx"

echo     ✓ Starter files created

REM Install dependencies
echo [7/8] Installing dependencies...
echo     This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo WARNING: npm install failed.
) else (
    echo     ✓ Dependencies installed
)
echo.

REM Initialize git
echo [8/8] Initializing git...
git init >nul 2>&1
echo     ✓ Git initialized
echo.

echo ========================================
echo ✅ PROJECT CREATED SUCCESSFULLY!
echo ========================================
echo.
echo Project: my-project
echo Location: %cd%
echo.
echo NEXT STEPS:
echo 1. cd my-project

echo 2. npm run dev
echo.
echo 🚀 Your customized project is ready!
echo.
pause
