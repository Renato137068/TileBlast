# Gera assets no formato aceito pela Google Play Store
# Saida: play-store/assets/
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "play-store\assets"
$shotDir = Join-Path $outDir "screenshots\phone"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $shotDir | Out-Null

# --- Icone 512x512 (loja) ---
$iconSrc = Join-Path $root "icon-512.png"
$iconDst = Join-Path $outDir "icon-512.png"
if (-not (Test-Path $iconSrc)) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "generate-icons.ps1")
}
if (Test-Path $iconSrc) {
  Copy-Item $iconSrc $iconDst -Force
  Write-Host "OK icon-512.png -> play-store/assets/"
}

function New-FeatureGraphic {
  param([string]$Path)
  $w = 1024; $h = 500
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point $w, $h),
    [System.Drawing.Color]::FromArgb(255, 26, 16, 48),
    [System.Drawing.Color]::FromArgb(255, 13, 15, 24)
  )
  $g.FillRectangle($brushBg, 0, 0, $w, $h)
  $brushBg.Dispose()

  $colors = @(
    [System.Drawing.Color]::FromArgb(255, 231, 76, 60),
    [System.Drawing.Color]::FromArgb(255, 52, 152, 219),
    [System.Drawing.Color]::FromArgb(255, 46, 204, 113),
    [System.Drawing.Color]::FromArgb(255, 155, 89, 182),
    [System.Drawing.Color]::FromArgb(255, 243, 156, 18),
    [System.Drawing.Color]::FromArgb(255, 230, 126, 34)
  )
  $positions = @(
    @(120, 180), @(190, 140), @(260, 200), @(700, 160), @(770, 220), @(840, 170)
  )
  for ($i = 0; $i -lt $positions.Count; $i++) {
    $px = $positions[$i][0]; $py = $positions[$i][1]
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $colors[$i]), $px, $py, 56, 56)
  }

  $fontTitle = New-Object System.Drawing.Font -ArgumentList "Arial Black", 64, ([System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font -ArgumentList "Arial", 26, ([System.Drawing.FontStyle]::Regular)
  $fontTag = New-Object System.Drawing.Font -ArgumentList "Arial", 18, ([System.Drawing.FontStyle]::Regular)
  $brushGold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 246, 178, 62))
  $brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
  $brushDim = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 160, 168, 192))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString("TILE BLAST", $fontTitle, $brushGold, (New-Object System.Drawing.RectangleF 0, 150, $w, 90), $sf)
  $g.DrawString("Exploda. Combine. Conquiste.", $fontSub, $brushWhite, (New-Object System.Drawing.RectangleF 0, 240, $w, 40), $sf)
  $g.DrawString("60+ fases | Puzzle diario | Modo infinito", $fontTag, $brushDim, (New-Object System.Drawing.RectangleF 0, 300, $w, 30), $sf)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$fgPath = Join-Path $outDir "feature-graphic-1024x500.png"
New-FeatureGraphic -Path $fgPath
Write-Host "OK feature-graphic-1024x500.png"

function New-ScreenshotPlaceholder {
  param([int]$Index, [string]$Path, [string]$Label)
  $w = 1080; $h = 1920
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(255, 13, 15, 24))

  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 246, 178, 62))
  $fontH = New-Object System.Drawing.Font -ArgumentList "Arial", 48, ([System.Drawing.FontStyle]::Bold)
  $fontB = New-Object System.Drawing.Font -ArgumentList "Arial", 28, ([System.Drawing.FontStyle]::Regular)
  $fontSm = New-Object System.Drawing.Font -ArgumentList "Arial", 22, ([System.Drawing.FontStyle]::Regular)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString("TILE BLAST", $fontH, $brush, (New-Object System.Drawing.RectangleF 0, 700, $w, 60), $sf)
  $g.DrawString($Label, $fontB, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), (New-Object System.Drawing.RectangleF 80, 800, ($w - 160), 200), $sf)
  $g.DrawString("SUBSTITUA por screenshot real`n(1080 x 1920 PNG ou JPEG)", $fontB, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 160, 168, 192))), (New-Object System.Drawing.RectangleF 80, 1100, ($w - 160), 120), $sf)
  $g.DrawString("Captura: Android Studio ou grave na tela do celular", $fontSm, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 160, 168, 192))), (New-Object System.Drawing.RectangleF 80, 1500, ($w - 160), 100), $sf)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$labels = @(
  "Tela do mapa / fases",
  "Gameplay no tabuleiro",
  "Loja e power-ups",
  "Puzzle diario global"
)
for ($i = 0; $i -lt $labels.Count; $i++) {
  $num = "{0:D2}" -f ($i + 1)
  $p = Join-Path $shotDir "phone-$num-PLACEHOLDER.png"
  New-ScreenshotPlaceholder -Index ($i + 1) -Path $p -Label $labels[$i]
  Write-Host "OK screenshots/phone/phone-$num-PLACEHOLDER.png (substitua antes de publicar)"
}

Write-Host ""
Write-Host "Assets prontos em: play-store/assets/"
Write-Host "Leia play-store/PUBLICACAO.md para o passo a passo completo."
