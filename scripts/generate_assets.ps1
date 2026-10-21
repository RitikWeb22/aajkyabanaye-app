Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\assets\logo.png"
$destDir = Join-Path $PSScriptRoot "..\app\assets\images"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

# 1. Copy original logo
Copy-Item $srcPath (Join-Path $destDir "logo.png") -Force

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#FFF9F0')

function Save-Resized($w, $h, $outName, $paddingPercent = 0) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($bgColor)

    if ($paddingPercent -gt 0) {
        $padX = [int]($w * $paddingPercent)
        $padY = [int]($h * $paddingPercent)
        $destW = $w - (2 * $padX)
        $destH = $h - (2 * $padY)
        $g.DrawImage($srcImg, $padX, $padY, $destW, $destH)
    } else {
        $g.DrawImage($srcImg, 0, 0, $w, $h)
    }
    
    $g.Dispose()
    $outPath = Join-Path $destDir $outName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $outName ($w x $h)"
}

# 2. App Icon 1024x1024
Save-Resized 1024 1024 "icon.png" 0

# 3. Adaptive Icon (foreground with 15% safe padding)
Save-Resized 1024 1024 "adaptive-icon.png" 0.15

# 4. Splash Icon
Save-Resized 1024 1024 "splash-icon.png" 0.10

# 5. Favicon 48x48
Save-Resized 48 48 "favicon.png" 0

# 6. Navbar logo 256x256
Save-Resized 256 256 "navbar-logo.png" 0

$srcImg.Dispose()
Write-Host "Asset generation complete!"
