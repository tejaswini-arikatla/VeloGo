$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $projectRoot "frontend"

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
    -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js and npm are required. Install a supported Node.js LTS release."
}

Set-Location $frontendPath
if (-not (Test-Path (Join-Path $frontendPath "package.json"))) {
    throw "package.json was not found in the frontend folder."
}
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    npm install
}
npm run dev
