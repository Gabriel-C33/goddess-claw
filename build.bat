@echo off
title GoddessClaw - Build
echo.
echo  ========================================
echo    GoddessClaw - Full Build
echo  ========================================
echo.

:: Build web UI
echo [1/4] Installing web dependencies...
cd /d "%~dp0web-ui"
call npm install
if errorlevel 1 (echo FAILED: npm install & pause & exit /b 1)

echo [2/4] Building web UI...
call npm run build
if errorlevel 1 (echo FAILED: vite build & pause & exit /b 1)

:: Copy built assets to Rust embedded dir
echo [3/4] Copying assets...
xcopy /Y /S "%~dp0web-ui\dist\assets\*" "%~dp0rust\crates\goddess-claw-web\src\assets\" >nul 2>&1
copy /Y "%~dp0web-ui\dist\index.html" "%~dp0rust\crates\goddess-claw-web\src\index.html" >nul 2>&1

:: Build Rust
echo [4/4] Building Rust binary...
cd /d "%~dp0rust"
cargo build --release
if errorlevel 1 (echo FAILED: cargo build & pause & exit /b 1)

:: Copy assets next to binary
xcopy /Y /S "%~dp0web-ui\dist\assets\*" "%~dp0rust\target\release\assets\" >nul 2>&1

echo.
echo  ========================================
echo    Build complete!
echo    Binary: rust\target\release\goddess-claw.exe
echo    Run:    start.bat
echo  ========================================
pause
