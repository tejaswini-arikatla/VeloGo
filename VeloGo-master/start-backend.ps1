$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java was not found. Install JDK 21 and add it to PATH."
}
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    throw "Maven was not found. Install Maven 3.9+ and add its bin folder to PATH."
}

Set-Location $backendPath
mvn spring-boot:run
