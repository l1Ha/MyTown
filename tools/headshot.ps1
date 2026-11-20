# MyTown headless self-test screenshots (Windows / Edge headless)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools\headshot.ps1 -Ver 79 -Ids sat,street,yard
#   powershell -ExecutionPolicy Bypass -File tools\headshot.ps1 -Ver 79 -Probe "window.__game.farm.plots.length"
#
# Screenshots and report.json are written to <repo>/shots/
param(
  [string]$Ver = '79',
  [string]$Ids = 'sat,overview,street,yard',
  [string]$Season = 'summer',
  [string]$Hour = '11.5',
  [string]$Probe = '',
  [int]$Timeout = 240,
  [int]$Port = 8150
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) {
  $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path $edge)) { throw 'msedge.exe not found' }

$shots = Join-Path $root 'shots'
New-Item -ItemType Directory -Force -Path $shots | Out-Null
$report = Join-Path $shots '_report.json'
if (Test-Path $report) { Remove-Item $report -Force }

$url = "http://127.0.0.1:$Port/?v=$Ver&sync=1&shot=1&ids=$Ids&season=$Season&hour=$Hour&wait=1200"
if ($Probe -ne '') { $url = $url + '&probe=' + [uri]::EscapeDataString($Probe) }

$profile = Join-Path $env:TEMP ('mytown-edge-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$edgeArgs = @(
  '--headless=new',
  '--disable-gpu',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  '--hide-scrollbars',
  '--window-size=1000,700',
  '--virtual-time-budget=180000',
  "--user-data-dir=$profile",
  $url
)

Write-Host "[headshot] $url"
$proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru

$deadline = (Get-Date).AddSeconds($Timeout)
$done = $false
while ((Get-Date) -lt $deadline) {
  if (Test-Path $report) {
    $age = (Get-Date) - (Get-Item $report).LastWriteTime
    if ($age.TotalSeconds -gt 1) { $done = $true; break }
  }
  Start-Sleep -Milliseconds 800
}

# Kill only the Edge processes that use this run's temp profile
Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch { } }
try { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue } catch { }

if (-not $done) { Write-Host '[headshot] timeout: report.json not found'; exit 1 }
Write-Host '[headshot] done:'
Get-Content $report -Raw
