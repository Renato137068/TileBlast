# Copia keystore + senhas para play-store/signing/backup/
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "play-store\signing"
$dst = Join-Path $src "backup"
New-Item -ItemType Directory -Force -Path $dst | Out-Null

$files = @("tileblast-upload.jks", "SUAS-SENHAS.txt")
foreach ($f in $files) {
  $from = Join-Path $src $f
  if (-not (Test-Path $from)) {
    Write-Host "ERRO: $from nao encontrado" -ForegroundColor Red
    exit 1
  }
  Copy-Item $from (Join-Path $dst $f) -Force
  Write-Host "OK $f -> play-store/signing/backup/"
}

Write-Host ""
Write-Host "Backup local atualizado. Copie a pasta backup/ para pendrive ou nuvem." -ForegroundColor Green
