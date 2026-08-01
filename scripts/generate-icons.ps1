# Gera icon-192.png e icon-512.png a partir do design do icon.svg (sem npm)
Add-Type -AssemblyName System.Drawing

function New-TileBlastIcon {
  param([int]$Size, [string]$OutPath)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(255, 13, 15, 24))

  $scale = $Size / 512.0
  $tiles = @(
    @{ X = 64;  Y = 64;  Color = [System.Drawing.Color]::FromArgb(255, 239, 75, 95) },
    @{ X = 288; Y = 64;  Color = [System.Drawing.Color]::FromArgb(255, 58, 166, 224) },
    @{ X = 64;  Y = 288; Color = [System.Drawing.Color]::FromArgb(255, 246, 201, 69) },
    @{ X = 288; Y = 288; Color = [System.Drawing.Color]::FromArgb(255, 78, 203, 113) }
  )

  foreach ($t in $tiles) {
    $x = [int][math]::Round($t.X * $scale)
    $y = [int][math]::Round($t.Y * $scale)
    $w = [int][math]::Round(160 * $scale)
    $h = [int][math]::Round(160 * $scale)
    $r = [int][math]::Max(4, [math]::Round(32 * $scale))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
    $path.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
    $path.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
    $path.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush $t.Color
    $g.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()
  }

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
New-TileBlastIcon -Size 192 -OutPath (Join-Path $root 'icon-192.png')
New-TileBlastIcon -Size 512 -OutPath (Join-Path $root 'icon-512.png')
Write-Host 'icon-192.png + icon-512.png generated'
