$ErrorActionPreference = 'Continue'
# Discover the jarvis-main project dir (ASCII path, verified to exist)
$project = 'C:\Users\Ishanth\Downloads\jarvis-main\jarvis-main'
if (-not (Test-Path (Join-Path $project 'package.json'))) { Write-Output 'PROJECT_NOT_FOUND'; exit 1 }

if (-not $project) { Write-Output 'PROJECT_NOT_FOUND'; exit 1 }
Write-Output "PROJECT=$project"

$logDir  = 'C:\Users\Ishanth\Downloads\jarvis-main\jarvis-main\.freebuff'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$stdout  = Join-Path $logDir 'preview-live.log'
$stderr  = Join-Path $logDir 'preview-live.log.err'
$bun     = 'C:\Users\Ishanth\AppData\Local\Programs\@codebufffreebuff-desktop\resources\bun\bun.exe'

Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue
New-Item -ItemType File -Path $stdout -Force | Out-Null

# Kill stale bun dev processes (keep the desktop orchestrator on 54891)
Get-Process -Name bun -ErrorAction SilentlyContinue | ForEach-Object {
  $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
  if ($cmdline -and $cmdline -notmatch 'orchestrator') {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}

$p = Start-Process -FilePath $bun `
  -ArgumentList 'run','dev','--','-p','3001' `
  -WorkingDirectory $project `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -WindowStyle Hidden -PassThru

Write-Output "SPAWNED_PID=$($p.Id)"

$up = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
  if ($conn) { $up = $true; break }
}
Write-Output "PORT_3001_UP=$up"
Get-Content $stdout -Tail 12 -ErrorAction SilentlyContinue
Write-Output '---STDERR---'
Get-Content $stderr -Tail 5 -ErrorAction SilentlyContinue
