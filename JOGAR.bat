@echo off
cd /d "%~dp0"
title Tile Blast
echo.
echo  Tile Blast - servidor local
echo  Abrindo http://localhost:8080
echo  Feche esta janela para parar o servidor.
echo.
start "" "http://localhost:8080"
call npm run serve:pwa
