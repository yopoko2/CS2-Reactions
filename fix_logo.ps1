Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\theyo\.gemini\antigravity\brain\99e10e99-7692-468e-bd73-837dae51b9dd\media__1775829128478.png"
$destPath = "e:\CS2 Reactions 2\src\assets\logo_square.png"

$img = [System.Drawing.Image]::FromFile($srcPath)
$max = [Math]::Max($img.Width, $img.Height)

$bmp = New-Object System.Drawing.Bitmap($max, $max)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$x = ($max - $img.Width) / 2
$y = ($max - $img.Height) / 2
$g.DrawImage($img, $x, $y, $img.Width, $img.Height)

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()
