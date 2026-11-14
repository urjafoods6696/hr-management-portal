@echo off
set "PATH=%~dp0tools\git\cmd;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo Pushing hr-management-portal project to GitHub:
echo https://github.com/Ajay-Bhor/hr-management-portal.git
echo ========================================================
echo.
git status
echo.
echo Pushing to branch main...
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo SUCCESS: Project pushed successfully to GitHub!
    echo https://github.com/Ajay-Bhor/hr-management-portal
    echo ========================================================
) else (
    echo ========================================================
    echo PUSH FAILED:
    echo 1. Ensure https://github.com/Ajay-Bhor/hr-management-portal is created or renamed on GitHub.
    echo 2. Check your GitHub credentials / internet connection.
    echo ========================================================
)
echo.
pause
