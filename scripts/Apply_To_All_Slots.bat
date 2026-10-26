@echo off
title SuperWarrior30 - Multi-Slot EA Deployer
echo ===============================================================
echo   SUPERWARRIOR30 - APPLY LATEST EA TO ALL MT5 SLOTS
echo ===============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Apply_To_All_Slots.ps1"
echo.
pause
