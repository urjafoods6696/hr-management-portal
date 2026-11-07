# ==============================================================================
# TalentPulse HR Portal - Automated Database Setup Script
# ==============================================================================
param (
    [string]$RootPassword = "125406",
    [string]$Port = "3306"
)

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    $found = Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $mysqlPath = $found.FullName
    } else {
        Write-Error "MySQL client (mysql.exe) not found under Program Files. Please ensure MySQL Server 8.0 is installed."
        exit 1
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TalentPulse HR Portal - MySQL 8.x Database Initializer " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Found MySQL at: $mysqlPath" -ForegroundColor Green

if ([string]::IsNullOrWhiteSpace($RootPassword)) {
    $PlainPassword = Read-Host -Prompt "Enter MySQL root password (default 125406)"
    if ([string]::IsNullOrWhiteSpace($PlainPassword)) {
        $PlainPassword = "125406"
    }
} else {
    $PlainPassword = $RootPassword
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Create Database
Write-Host "`n[1] Creating database 'hr_portal_db'..." -ForegroundColor Yellow
$createDbSql = "CREATE DATABASE IF NOT EXISTS hr_portal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port -e "$createDbSql" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to MySQL or create database. Please verify the root password." -ForegroundColor Red
    exit 1
}
Write-Host "Database 'hr_portal_db' created successfully!" -ForegroundColor Green

# 2. Run All Migrations in Sequence
$migrationFiles = Get-ChildItem (Join-Path $scriptDir "migrations") -Filter "V*__*.sql" | 
    Sort-Object { [int]($_.Name -replace '^V(\d+).*', '$1') }

$step = 2
foreach ($mig in $migrationFiles) {
    Write-Host "`n[$step] Executing $($mig.Name)..." -ForegroundColor Yellow
    $migPath = $mig.FullName.Replace('\', '/')
    & "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "source $migPath" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error executing $($mig.Name)." -ForegroundColor Red
        exit 1
    }
    Write-Host "$($mig.Name) executed successfully!" -ForegroundColor Green
    $step++
}

# 3. Verify Tables Count
Write-Host "`nVerification (Tables in hr_portal_db):" -ForegroundColor Cyan
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "SHOW TABLES;" 

Write-Host "`nDatabase setup completed successfully! Ready for Spring Boot backend." -ForegroundColor Green
