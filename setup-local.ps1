param(
  [switch]$UseBackendApi
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot "entraverse"
$backendDir = Join-Path $repoRoot "entraverse-api"
$sqlitePath = Join-Path $backendDir "database\database.sqlite"
$composerIniPath = Join-Path $backendDir "php-composer.ini"

function Resolve-CommandPath {
  param(
    [string]$CommandName,
    [string[]]$Fallbacks = @(),
    [string[]]$GlobFallbacks = @()
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($fallback in $Fallbacks) {
    if (Test-Path $fallback) {
      return $fallback
    }
  }

  foreach ($pattern in $GlobFallbacks) {
    $match = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($match) {
      return $match.FullName
    }
  }

  return $null
}

function Write-FrontendEnv {
  $envPath = Join-Path $frontendDir ".env.local"
  $apiUrl = "http://localhost:8000/api"

  $content = @"
NEXT_PUBLIC_API_URL=$apiUrl
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT=
BLOB_READ_WRITE_TOKEN=

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
"@

  Set-Content -Path $envPath -Value $content -Encoding ASCII
}

function Ensure-BackendEnv {
  $envPath = Join-Path $backendDir ".env"
  if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $backendDir ".env.example") $envPath
  }

  $content = Get-Content $envPath -Raw
  $content = $content -replace '(?m)^APP_URL=.*$', 'APP_URL=http://localhost:8000'
  $content = $content -replace '(?m)^APP_FRONTEND_URL=.*$', 'APP_FRONTEND_URL=http://localhost:3000'
  Set-Content -Path $envPath -Value $content -Encoding ASCII
}

function Ensure-ComposerPhpIni {
  param(
    [string]$PhpPath
  )

  if (Test-Path $composerIniPath) {
    return $composerIniPath
  }

  $sourceIni = Join-Path (Split-Path -Parent $PhpPath) "php.ini"
  if (-not (Test-Path $sourceIni)) {
    throw "php.ini tidak ditemukan di samping php.exe: $sourceIni"
  }

  Copy-Item $sourceIni $composerIniPath -Force
  $content = Get-Content $composerIniPath -Raw
  $content = $content -replace '(?m)^;extension=zip$', 'extension=zip'
  Set-Content -Path $composerIniPath -Value $content -Encoding ASCII

  return $composerIniPath
}

function Ensure-StorageLink {
  param(
    [string]$PhpPath
  )

  $storageLink = Join-Path $backendDir "public\storage"
  if (Test-Path $storageLink) {
    return
  }

  Write-Host "Creating backend storage link..."
  & $PhpPath artisan storage:link | Out-Host
}

$npm = Resolve-CommandPath -CommandName "npm.cmd" -Fallbacks @(
  "F:\VS Code Shafiq\Node JS\npm.cmd",
  "C:\Program Files\nodejs\npm.cmd",
  "C:\Program Files (x86)\nodejs\npm.cmd"
)

$php = Resolve-CommandPath -CommandName "php.exe" -Fallbacks @(
  "C:\xampp\php\php.exe",
  "C:\php\php.exe"
) -GlobFallbacks @(
  "C:\laragon\bin\php\*\php.exe"
)

$composerPhar = Resolve-CommandPath -CommandName "composer.phar" -Fallbacks @(
  "C:\laragon\bin\composer\composer.phar"
)

if (-not $npm) {
  throw "npm.cmd tidak ditemukan. Install Node.js atau tambahkan npm.cmd ke PATH."
}

if (-not $php) {
  throw "php.exe tidak ditemukan. Install PHP atau Laragon/XAMPP lalu jalankan ulang."
}

if (-not $composerPhar) {
  throw "composer.phar tidak ditemukan. Install Composer atau Laragon Composer lalu jalankan ulang."
}

Write-FrontendEnv
Ensure-BackendEnv
$composerIni = Ensure-ComposerPhpIni -PhpPath $php

if (-not (Test-Path $sqlitePath)) {
  New-Item -Path $sqlitePath -ItemType File | Out-Null
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendDir
  try {
    & $npm install --no-fund --no-audit
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path (Join-Path $backendDir "vendor"))) {
  Write-Host "Installing backend dependencies..."
  Push-Location $backendDir
  try {
    $env:COMPOSER_HOME = Join-Path $backendDir ".composer"
    $env:COMPOSER_CACHE_DIR = Join-Path $backendDir ".composer-cache"
    & $php -c $composerIni $composerPhar install --no-interaction --prefer-dist
  }
  finally {
    Pop-Location
  }
}

Push-Location $backendDir
try {
  & $php artisan key:generate --force
  & $php artisan migrate --force
  & $php artisan db:seed --class=AdminSeeder --force
  Ensure-StorageLink -PhpPath $php
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "Setup selesai."
Write-Host "Frontend: $frontendDir"
Write-Host "Backend : $backendDir"
Write-Host "Frontend diarahkan ke backend lokal: http://localhost:8000/api"
