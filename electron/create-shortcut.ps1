# Create JARVIS Desktop Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$Desktop\JARVIS.lnk")
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c cd /d `"$PSScriptRoot\..`" && `"$PSScriptRoot\..\electron\launch.bat`""
$Shortcut.WorkingDirectory = "$PSScriptRoot\.."
$Shortcut.Description = "J.A.R.V.I.S. Desktop AI Assistant"
$Shortcut.WindowStyle = 7
$Shortcut.Save()

Write-Host "Desktop shortcut created!" -ForegroundColor Green
