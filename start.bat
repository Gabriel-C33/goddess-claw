@echo off
title GoddessClaw
echo.
echo  Starting GoddessClaw on http://localhost:8989
echo  Press Ctrl+C to stop
echo.
cd /d "%~dp0rust"
if exist "target\release\goddess-claw.exe" (
    target\release\goddess-claw.exe
) else (
    echo Binary not found. Run build.bat first.
    pause
)
