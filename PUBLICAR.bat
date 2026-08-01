@echo off
cd /d "%~dp0"
title Tile Blast - Publicacao Play Store
echo.
echo  ========================================
echo   TILE BLAST - Preparar publicacao
echo  ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-publish.ps1
echo.
echo  ----------------------------------------
echo   Proximo: abra play-store\SO-PUBLICAR.md
echo   Ou: play-store\ENTREGA-FINAL.md
echo  ----------------------------------------
echo.
pause
