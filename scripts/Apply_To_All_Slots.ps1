# SuperWarrior30 - Multi-Slot EA Deployer
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "    SUPERWARRIOR30 - MULTI-SLOT EA DEPLOYMENT SCRIPT           " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Candidates = @(
    $ScriptDir,
    'C:\Users\user\Desktop\SuperWarrior_EAs',
    "$env:USERPROFILE\Desktop\SuperWarrior_EAs",
    'C:\MT5_Slave\MQL5\Experts',
    (Get-Location).Path
)

$SourceEx5 = $null
$SourceMq5 = $null

foreach ($cand in $Candidates) {
    if (Test-Path "$cand\SuperWarrior_Slave.ex5") {
        $SourceEx5 = "$cand\SuperWarrior_Slave.ex5"
        $SourceMq5 = "$cand\SuperWarrior_Slave.mq5"
        break
    }
}

if (-not $SourceEx5) {
    Write-Host "Error: SuperWarrior_Slave.ex5 not found!" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $SourceEx5).Length
Write-Host "Source File: $SourceEx5 ($fileSize bytes)" -ForegroundColor Green

$TargetDirs = [System.Collections.Generic.List[string]]::new()

# 1. Drive Root MT5 folders (C:\MT5*, C:\MT5 Slot*, C:\MT5_Slave*)
Get-ChildItem -Path 'C:\' -Directory -Filter '*MT5*' | ForEach-Object {
    if ($_.Name -notmatch 'Master') {
        $exp = Join-Path $_.FullName 'MQL5\Experts'
        if (Test-Path $exp) { $TargetDirs.Add($exp) }
    }
}

# 2. Program Files MT5 folders
Get-ChildItem -Path 'C:\Program Files', 'C:\Program Files (x86)' -Directory -Filter '*MT5*' | ForEach-Object {
    if ($_.Name -notmatch 'Master') {
        $exp = Join-Path $_.FullName 'MQL5\Experts'
        if (Test-Path $exp) { $TargetDirs.Add($exp) }
    }
}

# 3. Roaming MetaQuotes Terminal data directories (All MT5 accounts & slots)
$RoamingTerminals = Join-Path $env:APPDATA 'MetaQuotes\Terminal'
if (Test-Path $RoamingTerminals) {
    Get-ChildItem -Path $RoamingTerminals -Directory | ForEach-Object {
        $origin = Join-Path $_.FullName 'origin.txt'
        $isMaster = $false
        if (Test-Path $origin) {
            $originPath = (Get-Content $origin -Raw).Trim()
            if ($originPath -match 'Master') { $isMaster = $true }
        }
        if (-not $isMaster -and $_.Name -notin @('Common', 'Community')) {
            $exp = Join-Path $_.FullName 'MQL5\Experts'
            if (Test-Path $exp) { $TargetDirs.Add($exp) }
        }
    }
}

$UniqueTargets = $TargetDirs | Select-Object -Unique

Write-Host ""
Write-Host "Found $($UniqueTargets.Count) MT5 Slave/Slot directories:" -ForegroundColor Cyan
$count = 0

foreach ($dir in $UniqueTargets) {
    $count++
    Copy-Item -Path $SourceEx5 -Destination $dir -Force
    if (Test-Path $SourceMq5) {
        Copy-Item -Path $SourceMq5 -Destination $dir -Force
    }
    Write-Host "  [$count] Updated -> $dir" -ForegroundColor Green
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Successfully applied latest EA to all $count slots!" -ForegroundColor Yellow
Write-Host "In MT5: Right-click 'Expert Advisors' in Navigator -> Click 'Refresh'" -ForegroundColor White
Write-Host "===============================================================" -ForegroundColor Cyan
