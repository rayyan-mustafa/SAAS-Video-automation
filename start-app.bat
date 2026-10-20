@echo off
title AI Video Automation SaaS
cd /d "%~dp0"
echo ===================================================
echo Starting AI Video Automation SaaS Server...
echo ===================================================
echo Server starting at http://localhost:3000
echo.
start http://localhost:3000
npm run dev
pause
