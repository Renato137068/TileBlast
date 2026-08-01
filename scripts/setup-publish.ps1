# Tile Blast — prepara TUDO para publicar (rode uma vez)
# Uso: powershell -ExecutionPolicy Bypass -File scripts/setup-publish.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== Tile Blast: setup de publicacao ===" -ForegroundColor Cyan

function Find-Java {
  $candidates = @(
    "$env:JAVA_HOME\bin\keytool.exe",
    "C:\Program Files\Microsoft\jdk-21*\bin\keytool.exe",
    "C:\Program Files\Microsoft\jdk-17*\bin\keytool.exe",
    "C:\Program Files\Eclipse Adoptium\jdk-17*\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\keytool.exe"
  )
  foreach ($pattern in $candidates) {
    $found = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  $w = Get-Command keytool -ErrorAction SilentlyContinue
  if ($w) { return $w.Source }
  return $null
}

# 1. Assets da loja
Write-Host ""
Write-Host "[1/5] Gerando assets Play Store..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "generate-play-store-assets.ps1")

# 2. Sync web -> android
Write-Host ""
Write-Host "[2/5] Sincronizando www + Capacitor..."
npm run cap:sync

# 3. Keystore
$jks = Join-Path $root "play-store\signing\tileblast-upload.jks"
$props = Join-Path $root "android\keystore.properties"
$secrets = Join-Path $root "play-store\signing\SUAS-SENHAS.txt"
$keytool = Find-Java

if (-not (Test-Path $jks)) {
  if (-not $keytool) {
    Write-Host ""
    Write-Host "AVISO: keytool nao encontrado. Instale JDK 21 (build Android):" -ForegroundColor Yellow
    Write-Host "  winget install Microsoft.OpenJDK.21"
    Write-Host "Depois rode este script novamente."
  } else {
    Write-Host ""
    Write-Host "[3/5] Criando keystore de assinatura..."
    $storePass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    $keyPass = $storePass
    $dname = "CN=Tile Blast, OU=Mobile, O=TileBlast, L=SaoPaulo, ST=SP, C=BR"
    & $keytool -genkeypair -v `
      -keystore $jks `
      -alias tileblast `
      -keyalg RSA -keysize 2048 -validity 10000 `
      -storepass $storePass -keypass $keyPass `
      -dname $dname

    $secretLines = @(
      "GUARDE ESTE ARQUIVO EM LOCAL SEGURO (nao compartilhe)",
      "",
      "Keystore: play-store/signing/tileblast-upload.jks",
      "Alias: tileblast",
      "Senha da keystore: $storePass",
      "Senha da chave: $keyPass",
      "",
      "Sem este arquivo voce NAO consegue atualizar o app na Play Store."
    )
    $secretLines | Set-Content $secrets -Encoding UTF8

    $propLines = @(
      "storeFile=../../play-store/signing/tileblast-upload.jks",
      "storePassword=$storePass",
      "keyAlias=tileblast",
      "keyPassword=$keyPass"
    )
    $propLines | Set-Content $props -Encoding ASCII

    Write-Host "OK Keystore criada. Senhas em: play-store/signing/SUAS-SENHAS.txt" -ForegroundColor Green
  }
} else {
  Write-Host ""
  Write-Host "[3/5] Keystore ja existe - pulando."
  if (-not (Test-Path $props)) {
    Write-Host "Configure android/keystore.properties (veja keystore.properties.example)" -ForegroundColor Yellow
  }
}

# 4. Build AAB
Write-Host ""
Write-Host "[4/5] Tentando gerar AAB..."
$sdk = $env:ANDROID_HOME
if (-not $sdk -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
if (Test-Path $props) {
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-release-aab.ps1") -SkipSync
  } catch {
    Write-Host "AAB nao gerado (falta Android SDK / Android Studio)." -ForegroundColor Yellow
    Write-Host "Instale Android Studio, abra o projeto android/ e: Build > Generate Signed Bundle"
  }
} else {
  Write-Host "Pule AAB ate configurar keystore." -ForegroundColor Yellow
}

# 5. Resumo
Write-Host ""
Write-Host "[5/5] Concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: abra play-store/SO-PUBLICAR.md"
Write-Host "Sao so alguns cliques na Play Console que so VOCE pode fazer (conta Google)."
Write-Host ""
