[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeDirectory = Join-Path $repositoryRoot ".local-run"
$pidFile = Join-Path $runtimeDirectory "processes.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host "No tracked local project processes were found."
    exit 0
}

$tracked = @(Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json)
$allProcesses = @(Get-CimInstance Win32_Process)
$idsToStop = [System.Collections.Generic.HashSet[int]]::new()

function Add-ProcessTree([int]$ParentId) {
    foreach ($child in @($allProcesses | Where-Object { $_.ParentProcessId -eq $ParentId })) {
        Add-ProcessTree ([int]$child.ProcessId)
    }
    [void]$idsToStop.Add($ParentId)
}

foreach ($entry in $tracked) {
    Add-ProcessTree ([int]$entry.Id)
}

foreach ($processId in $idsToStop) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Stopped the local Workforce Management and chatbot services." -ForegroundColor Green
