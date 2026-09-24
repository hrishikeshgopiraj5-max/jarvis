# Create JARVIS Desktop Shortcut with proper icon and silent launch
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")

$Shortcut = $WshShell.CreateShortcut("$Desktop\JARVIS.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\launch.vbs"
$Shortcut.WorkingDirectory = "$PSScriptRoot\.."
$Shortcut.Description = "J.A.R.V.I.S. Desktop AI Assistant"
$Shortcut.IconLocation = "$PSScriptRoot\icon.ico,0"
$Shortcut.WindowStyle = 7
$Shortcut.Save()

Write-Host "Desktop shortcut created with JARVIS icon!" -ForegroundColor Green
Write-Host "Location: $Desktop\JARVIS.lnk" -ForegroundColor Cyan
Write-Host "Double-click to launch JARVIS silently." -ForegroundColor Gray
