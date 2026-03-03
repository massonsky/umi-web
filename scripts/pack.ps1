#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Собирает @umi/components в .tgz npm-пакет.
.PARAMETER BumpType
    Тип bump версии: patch | minor | major | none (default: none)
.PARAMETER OutputDir
    Каталог для сохранения .tgz (default: текущая папка)
.EXAMPLE
    .\scripts\pack.ps1
    .\scripts\pack.ps1 -BumpType patch
    .\scripts\pack.ps1 -BumpType minor -OutputDir C:\Releases
#>
param(
    [ValidateSet('patch', 'minor', 'major', 'none')]
    [string]$BumpType = 'none',

    [string]$OutputDir = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host "`n=== @umi/components pack script ===" -ForegroundColor Cyan

# ----- 1. Bump version -----
if ($BumpType -ne 'none') {
    Write-Host "[1/4] Bump version ($BumpType)..." -ForegroundColor Yellow
    npm version $BumpType --no-git-tag-version
} else {
    Write-Host "[1/4] Version bump skipped." -ForegroundColor DarkGray
}

# ----- 2. Clean dist -----
Write-Host "[2/4] Cleaning dist/..." -ForegroundColor Yellow
if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }

# ----- 3. Build -----
Write-Host "[3/4] Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build FAILED!" -ForegroundColor Red
    exit 1
}

# ----- 4. Pack -----
Write-Host "[4/4] Packing..." -ForegroundColor Yellow
$PackOutput = npm pack --pack-destination $OutputDir 2>&1
$TgzName = $PackOutput | Select-String '\.tgz$' | ForEach-Object { $_.Line.Trim() }

if (-not $TgzName) {
    $TgzName = (Get-ChildItem $OutputDir -Filter '*.tgz' | Sort-Object LastWriteTime | Select-Object -Last 1).Name
}

$TgzPath = Join-Path $OutputDir $TgzName
$SizeKB   = [math]::Round((Get-Item $TgzPath).Length / 1KB, 1)

Write-Host "`n OK  $TgzName ($SizeKB KB)" -ForegroundColor Green
Write-Host "     Path: $TgzPath`n"

# ----- Установка -----
$Version = (Get-Content 'package.json' -Raw | ConvertFrom-Json).version
Write-Host "Install via:" -ForegroundColor DarkGray
Write-Host "  npm install $TgzPath" -ForegroundColor DarkGray
Write-Host "  # или после публикации:" -ForegroundColor DarkGray
Write-Host "  npm install @umi/components@$Version" -ForegroundColor DarkGray
