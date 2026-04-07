$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "entraverse-api"

function Resolve-Php {
  $command = Get-Command "php.exe" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($pattern in @(
    "C:\laragon\bin\php\*\php.exe"
  )) {
    $match = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($match) {
      return $match.FullName
    }
  }

  foreach ($fallback in @(
    "C:\xampp\php\php.exe",
    "C:\php\php.exe"
  )) {
    if (Test-Path $fallback) {
      return $fallback
    }
  }

  throw "php.exe tidak ditemukan."
}

$php = Resolve-Php
Push-Location $backendDir
try {
  $storageLink = Join-Path $backendDir "public\storage"
  if (-not (Test-Path $storageLink)) {
    & $php artisan storage:link | Out-Host
  }

  & $php artisan serve --host=localhost --port=8000
}
finally {
  Pop-Location
}
