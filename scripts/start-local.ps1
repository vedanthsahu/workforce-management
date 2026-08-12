[CmdletBinding()]
param(
    [string]$SsmTarget = "i-0153bd7a0d634092e",
    [string]$DatabaseHost = "seatbooking-postgres-dev.cvkc2ksmizz4.ap-south-1.rds.amazonaws.com",
    [string]$AwsRegion = "ap-south-1",
    [int]$StartupTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeDirectory = Join-Path $repositoryRoot ".local-run"
$pidFile = Join-Path $runtimeDirectory "processes.json"

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Import-DotEnvValue([string]$Path, [string]$Name) {
    $line = Get-Content -LiteralPath $Path | Where-Object {
        $_ -match "^\s*$([regex]::Escape($Name))\s*="
    } | Select-Object -Last 1

    if (-not $line) { return $null }
    $value = ($line -split "=", 2)[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    return $value.Trim()
}

function Get-PortOwner([int]$Port) {
    $matchingLine = netstat -ano | Select-String "LISTENING" | Where-Object {
        (($_.Line.Trim() -split "\s+")[1]) -match ":$Port$"
    } | Select-Object -First 1
    if (-not $matchingLine) { return $null }
    return [int](($matchingLine.Line.Trim() -split "\s+")[-1])
}

function Start-LoggedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    $stdout = Join-Path $runtimeDirectory "$Name.out.log"
    $stderr = Join-Path $runtimeDirectory "$Name.err.log"
    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    return [PSCustomObject]@{ Name = $Name; Id = $process.Id }
}

function Test-HttpEndpoint([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Set-Location $repositoryRoot

$requiredFiles = @(
    ".env",
    ".venv\Scripts\python.exe",
    "frontend\node_modules",
    "frontend\.env.local",
    "efacility-chatbot\backend\.venv\Scripts\python.exe",
    "efacility-chatbot\backend\.env",
    "efacility-chatbot\frontend\node_modules"
)

foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $relativePath))) {
        Fail "Missing $relativePath. Complete the first-time setup in README.md."
    }
}

foreach ($commandName in @("aws.exe", "npm.cmd")) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        Fail "$commandName is not installed or is not available on PATH."
    }
}

$occupied = foreach ($port in @(3000, 4200, 8000, 8100, 15432)) {
    $ownerPid = Get-PortOwner $port
    if ($ownerPid) { "${port} (PID $ownerPid)" }
}
if ($occupied) {
    Fail "Required ports are already in use: $($occupied -join ', '). Run .\scripts\stop-local.ps1 or stop the owning processes."
}

$rootEnv = Join-Path $repositoryRoot ".env"
$accessKey = Import-DotEnvValue $rootEnv "AWS_ACCESS_KEY_ID"
$secretKey = Import-DotEnvValue $rootEnv "AWS_SECRET_ACCESS_KEY"
if (-not $accessKey -or -not $secretKey) {
    Fail "AWS credentials are missing from the root .env file."
}
$env:AWS_ACCESS_KEY_ID = $accessKey
$env:AWS_SECRET_ACCESS_KEY = $secretKey
$env:AWS_REGION = $AwsRegion

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue

$processes = @()
try {
    Write-Host "Starting database tunnel..."
    $processes += Start-LoggedProcess `
        -Name "database-tunnel" `
        -FilePath "aws.exe" `
        -Arguments @(
            "ssm", "start-session",
            "--target", $SsmTarget,
            "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
            "--parameters", "host=$DatabaseHost,portNumber=5432,localPortNumber=15432",
            "--region", $AwsRegion
        ) `
        -WorkingDirectory $repositoryRoot

    $tunnelDeadline = (Get-Date).AddSeconds(30)
    while (-not (Get-PortOwner 15432)) {
        if ((Get-Date) -gt $tunnelDeadline) {
            throw "Database tunnel did not open port 15432."
        }
        Start-Sleep -Seconds 1
    }

    Write-Host "Starting APIs and frontends..."
    $processes += Start-LoggedProcess -Name "main-api" `
        -FilePath (Join-Path $repositoryRoot ".venv\Scripts\python.exe") `
        -Arguments @("-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $repositoryRoot

    $chatbotBackend = Join-Path $repositoryRoot "efacility-chatbot\backend"
    $processes += Start-LoggedProcess -Name "chatbot-api" `
        -FilePath (Join-Path $chatbotBackend ".venv\Scripts\python.exe") `
        -Arguments @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8100") `
        -WorkingDirectory $chatbotBackend

    $processes += Start-LoggedProcess -Name "main-frontend" `
        -FilePath "npm.cmd" `
        -Arguments @("run", "dev", "--", "-H", "localhost", "-p", "3000") `
        -WorkingDirectory (Join-Path $repositoryRoot "frontend")

    $processes += Start-LoggedProcess -Name "chatbot-frontend" `
        -FilePath "npm.cmd" `
        -Arguments @("run", "start", "--", "-H", "localhost", "-p", "4200") `
        -WorkingDirectory (Join-Path $repositoryRoot "efacility-chatbot\frontend")

    $processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8

    $endpoints = [ordered]@{
        "Main application" = "http://localhost:3000/login"
        "Chatbot frontend" = "http://localhost:4200/?embedded=1"
        "Main API" = "http://127.0.0.1:8000/health"
        "Chatbot API" = "http://127.0.0.1:8100/health"
    }

    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $pending = @($endpoints.Keys)
    while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
        $pending = @($pending | Where-Object { -not (Test-HttpEndpoint $endpoints[$_]) })
        if ($pending.Count -gt 0) { Start-Sleep -Seconds 2 }
    }

    if ($pending.Count -gt 0) {
        throw "Startup verification failed for: $($pending -join ', '). See .local-run\*.err.log."
    }

    Write-Host ""
    Write-Host "All services are running." -ForegroundColor Green
    Write-Host "Main application: http://localhost:3000"
    Write-Host "Main API:         http://localhost:8000"
    Write-Host "Chatbot UI:       http://localhost:4200"
    Write-Host "Chatbot API:      http://localhost:8100"
    Write-Host "Logs:             $runtimeDirectory"
    Write-Host "Stop everything:  .\scripts\stop-local.ps1"
} catch {
    $processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Run .\scripts\stop-local.ps1 before trying again."
    exit 1
}
