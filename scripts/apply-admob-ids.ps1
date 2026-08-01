# Aplica IDs AdMob de producao nos arquivos Android
param([string]$EnvFile = "")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) {
  $EnvFile = Join-Path $root "play-store\console\IDS-PRODUCAO.env"
}
if (-not (Test-Path $EnvFile)) {
  Write-Host "Crie $EnvFile a partir de IDS-PRODUCAO.env.example" -ForegroundColor Red
  exit 1
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_ -split '=', 2
  $vars[$k.Trim()] = $v.Trim()
}

foreach ($k in @('ADMOB_APP_ID','ADMOB_REWARDED','ADMOB_INTERSTITIAL')) {
  if (-not $vars[$k] -or $vars[$k] -match 'XXXX') {
    Write-Host "Preencha $k em $EnvFile" -ForegroundColor Red
    exit 1
  }
}

$manifest = Join-Path $root "android\app\src\main\AndroidManifest.xml"
$bridge = Join-Path $root "android\app\src\main\java\com\tileblast\game\TileBlastBridge.java"
$bridgeRef = Join-Path $root "android-native\TileBlastBridge.java"

$m = Get-Content $manifest -Raw
$m = $m -replace 'android:value="ca-app-pub-[^"]+"', "android:value=`"$($vars.ADMOB_APP_ID)`""
Set-Content $manifest $m -NoNewline

foreach ($path in @($bridge, $bridgeRef)) {
  if (-not (Test-Path $path)) { continue }
  $b = Get-Content $path -Raw
  $b = $b -replace 'REWARDED_AD_UNIT = "ca-app-pub-[^"]+"', "REWARDED_AD_UNIT = `"$($vars.ADMOB_REWARDED)`""
  $b = $b -replace 'INTERSTITIAL_AD_UNIT = "ca-app-pub-[^"]+"', "INTERSTITIAL_AD_UNIT = `"$($vars.ADMOB_INTERSTITIAL)`""
  Set-Content $path $b -NoNewline
}

Write-Host "AdMob IDs aplicados (android + android-native). Rode: npm run cap:sync" -ForegroundColor Green
