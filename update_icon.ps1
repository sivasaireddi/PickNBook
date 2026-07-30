[Reflection.Assembly]::LoadWithPartialName("System.Drawing")
$srcPath = "C:\Users\ADMIN\.gemini\antigravity-ide\brain\d7152d87-e1c5-410b-9402-89598765a04c\media__1784695191077.jpg"
$destPath = "$PSScriptRoot\assets\icon.png"

if (-not (Test-Path $srcPath)) {
    $srcPath = "C:\Users\ADMIN\.gemini\antigravity-ide\brain\d7152d87-e1c5-410b-9402-89598765a04c\media__1784694958046.jpg"
}

Write-Output "Loading design sheet from $srcPath..."
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$w = $srcImg.Width
$h = $srcImg.Height

Write-Output "Image size is ${w}x${h}."
Write-Output "Cropping PickNbook square logo from the left..."

$cropX = 0
$cropY = [int]($h * 0.025)
$cropW = [int]($w * 0.718)
$cropH = [int]($h * 0.718)

$bmp = New-Object System.Drawing.Bitmap $cropW, $cropH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$rectDest = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
$rectSrc = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH

$g.DrawImage($srcImg, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)

Write-Output "Resizing to 512x512 pixels..."
$finalBmp = New-Object System.Drawing.Bitmap 512, 512
$finalG = [System.Drawing.Graphics]::FromImage($finalBmp)
$finalG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$finalG.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$rectFinalDest = New-Object System.Drawing.Rectangle 0, 0, 512, 512
$finalG.DrawImage($bmp, $rectFinalDest, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)

Write-Output "Saving to $destPath..."
$finalBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Clean up
$srcImg.Dispose()
$bmp.Dispose()
$g.Dispose()
$finalBmp.Dispose()
$finalG.Dispose()

Write-Output "Successfully updated app icon toassets/icon.png!"
