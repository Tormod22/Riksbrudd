@echo off
chcp 65001 >nul
title Riksbrudd-tjeneren
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Fant ikke Node.js på denne PC-en.
  echo Last ned og installer «LTS»-utgaven fra https://nodejs.org/
  echo og dobbeltklikk så på start-tjener.bat igjen.
  echo.
  pause
  exit /b 1
)
node "%~dp0riksbrudd-tjener.js" --tunnel --nettleser
pause
