# Build release AAB assinado para Google Play
param(
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Resolve-JavaHome {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $v = & (Join-Path $env:JAVA_HOME "bin\java.exe") -version 2>&1 | Out-String
    if ($v -match 'version "21') { return $env:JAVA_HOME }
  }
  $patterns = @(
    "C:\Program Files\Microsoft\jdk-21*\",
    "C:\Program Files\Android\Android Studio\jbr\",
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\"
  )
  foreach ($pattern in $patterns) {
    $dir = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($dir -and (Test-Path (Join-Path $dir.FullName "bin\java.exe"))) { return $dir.FullName.TrimEnd('\') }
  }
  if ($env:JAVA_HOME) { return $env:JAVA_HOME }
  return $null
}

$javaHome = Resolve-JavaHome
if ($javaHome) {
  $env:JAVA_HOME = $javaHome
  Write-Host ">> JAVA_HOME=$javaHome"
} else {
  Write-Host "AVISO: JDK 21 nao encontrado. Capacitor 7 exige Java 21:" -ForegroundColor Yellow
  Write-Host "  winget install Microsoft.OpenJDK.21"
}

if (-not $SkipSync) {
  Write-Host ">> npm test"
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ">> npm run build:release"
  npm run build:release
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$propsFile = Join-Path $root "android\keystore.properties"
if (-not (Test-Path $propsFile)) {
  Write-Host ""
  Write-Host "ERRO: android/keystore.properties nao encontrado." -ForegroundColor Red
  Write-Host "Copie android/keystore.properties.example e configure sua chave de assinatura."
  Write-Host "Veja play-store/signing/COMO-ASSINAR.md"
  exit 1
}

Write-Host ">> gradlew bundleRelease"
Set-Location (Join-Path $root "android")
& .\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$aabSrc = Join-Path $root "android\app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aabSrc)) {
  Write-Host "ERRO: AAB nao gerado em $aabSrc" -ForegroundColor Red
  exit 1
}

# Ler versionName do build.gradle
$gradle = Get-Content (Join-Path $root "android\app\build.gradle") -Raw
$ver = "1.0.0"
if ($gradle -match 'versionName\s+"([^"]+)"') { $ver = $Matches[1] }

$releaseDir = Join-Path $root "play-store\release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$aabDst = Join-Path $releaseDir "tileblast-v$ver.aab"
Copy-Item $aabSrc $aabDst -Force

Write-Host ""
Write-Host "SUCESSO: AAB pronto para upload" -ForegroundColor Green
Write-Host "  $aabDst"
Write-Host ""
Write-Host "Proximo passo: Play Console > Testar e publicar > Producao > Criar nova versao > Upload"
