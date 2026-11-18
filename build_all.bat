@echo off
title TalentPulse - Build All (Frontend + Backend)
echo ==========================================================
echo  TalentPulse Full Stack Build
echo ==========================================================

set JAVA_HOME=C:\Program Files\Java\jdk-25.0.5.0.3
set MVN_BIN=%~dp0tools\apache-maven-3.9.6\bin\mvn.cmd

echo.
echo [1/2] Building Frontend (React + Vite)...
cd /d "%~dp0hr-management-portal\frontend"
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Building Backend JAR (Spring Boot Maven)...
cd /d "%~dp0hr-management-portal\backend"
call "%MVN_BIN%" package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================================
echo  SUCCESS: Full stack build completed cleanly!
echo ==========================================================
cd /d "%~dp0"
pause
