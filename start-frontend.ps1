$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot "entraverse"

function Resolve-Npm {
  $command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($fallback in @(
    "F:\VS Code Shafiq\Node JS\npm.cmd",
    "C:\Program Files\nodejs\npm.cmd",
    "C:\Program Files (x86)\nodejs\npm.cmd"
  )) {
    if (Test-Path $fallback) {
      return $fallback
    }
  }

  throw "npm.cmd tidak ditemukan."
}

$npm = Resolve-Npm
Push-Location $frontendDir
try {
  & $npm run dev
}
finally {
  Pop-Location
}
