<# :
@echo off
setlocal
title "SuperWarrior30 - Universal Multi-Slot and Master EA Deployer"
color 0B
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression ([System.IO.File]::ReadAllText('%~f0'))"
echo.
pause
exit /b %ERRORLEVEL%
#>

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "    SUPERWARRIOR30 - MASTER & ALL SLOTS DEPLOYMENT SCRIPT      " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan

# 1. Locate Source Files
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

$SearchDirs = @(
    $ScriptDir,
    'C:\Users\Administrator\Desktop\SuperWarrior_EAs',
    'C:\Users\user\Desktop\SuperWarrior_EAs',
    "$env:USERPROFILE\Desktop\SuperWarrior_EAs",
    'C:\MT5_Master\MQL5\Experts',
    'C:\MT5_Slave\MQL5\Experts',
    (Get-Location).Path
) | Where-Object { Test-Path $_ } | Select-Object -Unique

$SlaveEx5  = $null
$SlaveMq5  = $null
$MasterEx5 = $null
$MasterMq5 = $null

foreach ($dir in $SearchDirs) {
    if (-not $SlaveEx5 -and (Test-Path "$dir\SuperWarrior_Slave.ex5")) {
        $SlaveEx5 = "$dir\SuperWarrior_Slave.ex5"
        $SlaveMq5 = "$dir\SuperWarrior_Slave.mq5"
    }
    if (-not $MasterEx5 -and (Test-Path "$dir\SuperWarrior_Master.ex5")) {
        $MasterEx5 = "$dir\SuperWarrior_Master.ex5"
        $MasterMq5 = "$dir\SuperWarrior_Master.mq5"
    }
}

if (-not $SlaveEx5) {
    Write-Host "Error: SuperWarrior_Slave.ex5 not found in any search path!" -ForegroundColor Red
    exit 1
}

$slaveSize = (Get-Item $SlaveEx5).Length
Write-Host "Slave EA  : $SlaveEx5 ($slaveSize bytes)" -ForegroundColor Green

if ($MasterEx5) {
    $masterSize = (Get-Item $MasterEx5).Length
    Write-Host "Master EA : $MasterEx5 ($masterSize bytes)" -ForegroundColor Green
}

$MasterTargets = [System.Collections.Generic.List[string]]::new()
$SlaveTargets  = [System.Collections.Generic.List[string]]::new()

function Add-TargetDirectory([string]$expertsDir, [bool]$isMaster) {
    if (-not (Test-Path $expertsDir)) {
        try { New-Item -ItemType Directory -Path $expertsDir -Force | Out-Null } catch {}
    }
    if (Test-Path $expertsDir) {
        $fullPath = (Get-Item $expertsDir).FullName
        if ($isMaster) {
            if (-not $MasterTargets.Contains($fullPath)) { $MasterTargets.Add($fullPath) }
        } else {
            if (-not $SlaveTargets.Contains($fullPath)) { $SlaveTargets.Add($fullPath) }
        }
    }
}

# -------------------------------------------------------------------
# SCANNER 1: Desktop Shortcuts (Reads Slot1.lnk, Slot2.lnk, Master.lnk etc.)
# -------------------------------------------------------------------
$WshShell = New-Object -ComObject WScript.Shell
$DesktopDirs = @(
    [Environment]::GetFolderPath('Desktop'),
    'C:\Users\Administrator\Desktop',
    'C:\Users\Public\Desktop',
    "$env:USERPROFILE\Desktop"
) | Where-Object { Test-Path $_ } | Select-Object -Unique

foreach ($desk in $DesktopDirs) {
    Get-ChildItem -Path $desk -Filter '*.lnk' | ForEach-Object {
        try {
            $sc = $WshShell.CreateShortcut($_.FullName)
            if ($sc.TargetPath -like '*terminal*.exe') {
                $tDir = Split-Path -Parent $sc.TargetPath
                $expDir = Join-Path $tDir 'MQL5\Experts'
                $isMaster = ($_.BaseName -match 'Master' -or $tDir -match 'Master')
                Add-TargetDirectory -expertsDir $expDir -isMaster $isMaster
            }
        } catch {}
    }
}

# -------------------------------------------------------------------
# SCANNER 2: Root & Program Files Drives (C:\, D:\ for Slot*, MT5*, etc.)
# -------------------------------------------------------------------
$DriveRoots = @('C:\', 'D:\', 'C:\Program Files', 'C:\Program Files (x86)') | Where-Object { Test-Path $_ }

foreach ($root in $DriveRoots) {
    Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $folderName = $_.Name
        if ($folderName -match 'MT5' -or $folderName -match 'Slot' -or $folderName -match 'Slave' -or $folderName -match 'Master') {
            $termExe = Join-Path $_.FullName 'terminal64.exe'
            $expDir = Join-Path $_.FullName 'MQL5\Experts'
            if ((Test-Path $termExe) -or (Test-Path $expDir)) {
                $isMaster = ($folderName -match 'Master')
                Add-TargetDirectory -expertsDir $expDir -isMaster $isMaster
            }
        }
    }
}

# -------------------------------------------------------------------
# SCANNER 3: AppData Roaming MetaQuotes Data Directories (All Users)
# -------------------------------------------------------------------
$AppDataBases = @(
    (Join-Path $env:APPDATA 'MetaQuotes\Terminal'),
    'C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal'
) | Where-Object { Test-Path $_ } | Select-Object -Unique

foreach ($appDataPath in $AppDataBases) {
    Get-ChildItem -Path $appDataPath -Directory | ForEach-Object {
        if ($_.Name -notin @('Common', 'Community')) {
            $origin = Join-Path $_.FullName 'origin.txt'
            $isMaster = $false
            if (Test-Path $origin) {
                $originText = (Get-Content $origin -Raw).Trim()
                if ($originText -match 'Master') { $isMaster = $true }
            }
            $expDir = Join-Path $_.FullName 'MQL5\Experts'
            Add-TargetDirectory -expertsDir $expDir -isMaster $isMaster
        }
    }
}

# -------------------------------------------------------------------
# DEPLOYMENT EXECUTION
# -------------------------------------------------------------------
Write-Host ""
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "TARGET MASTER TERMINALS: $($MasterTargets.Count)" -ForegroundColor Magenta
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan
$mCount = 0
foreach ($mDir in $MasterTargets) {
    $mCount++
    if ($MasterEx5 -and (Test-Path $MasterEx5)) {
        Copy-Item -Path $MasterEx5 -Destination $mDir -Force
    }
    if ($MasterMq5 -and (Test-Path $MasterMq5)) {
        Copy-Item -Path $MasterMq5 -Destination $mDir -Force
    }
    Write-Host "  [$mCount] Master Updated -> $mDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "TARGET SLAVE/SLOT TERMINALS: $($SlaveTargets.Count)" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------" -ForegroundColor Cyan
$sCount = 0
foreach ($sDir in $SlaveTargets) {
    $sCount++
    Copy-Item -Path $SlaveEx5 -Destination $sDir -Force
    if ($SlaveMq5 -and (Test-Path $SlaveMq5)) {
        Copy-Item -Path $SlaveMq5 -Destination $sDir -Force
    }
    Write-Host "  [$sCount] Slot Updated -> $sDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "ALL DONE! Successfully Updated $mCount Master + $sCount Slave Slots!" -ForegroundColor Yellow
Write-Host "Next Step: In MT5, Right-click 'Expert Advisors' -> 'Refresh'" -ForegroundColor White
Write-Host "OR Restart MT5 terminals to load new code." -ForegroundColor White
Write-Host "===============================================================" -ForegroundColor Cyan
