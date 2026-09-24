' JARVIS Silent Launcher — no terminal window
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get project root (parent of electron folder)
projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(projectRoot)

' Launch via cmd silently
cmd = "cmd.exe /c cd /d """ & projectRoot & """ && """ & projectRoot & "\electron\launch.bat"""
WshShell.Run cmd, 0, False
