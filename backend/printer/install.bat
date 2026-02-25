@echo off
echo ============================================
echo PrintAgent Installer
echo ============================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click install.bat and select "Run as Administrator"
    pause
    exit /b 1
)

echo [1/4] Creating directory...
if not exist "C:\PrintAgent" mkdir "C:\PrintAgent"
copy /Y PrintAgent.exe C:\PrintAgent\PrintAgent.exe
echo Done!
echo.

echo [2/4] Adding to Windows Startup...
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\shortcut.vbs"
echo sLinkFile = "%STARTUP%\PrintAgent.lnk" >> "%TEMP%\shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\shortcut.vbs"
echo oLink.TargetPath = "C:\PrintAgent\PrintAgent.exe" >> "%TEMP%\shortcut.vbs"
echo oLink.WorkingDirectory = "C:\PrintAgent" >> "%TEMP%\shortcut.vbs"
echo oLink.Description = "POS Printer Service" >> "%TEMP%\shortcut.vbs"
echo oLink.Save >> "%TEMP%\shortcut.vbs"
cscript /nologo "%TEMP%\shortcut.vbs"
del "%TEMP%\shortcut.vbs"
echo Done!
echo.

echo [3/4] Creating uninstaller...
(
echo @echo off
echo echo Uninstalling PrintAgent...
echo taskkill /F /IM PrintAgent.exe 2^>nul
echo timeout /t 2 /nobreak ^> nul
echo del /F /Q "C:\PrintAgent\PrintAgent.exe"
echo del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PrintAgent.lnk"
echo rd /S /Q "C:\PrintAgent"
echo echo PrintAgent uninstalled.
echo pause
) > "C:\PrintAgent\uninstall.bat"
echo Done!
echo.

echo [4/4] Starting PrintAgent...
start "" "C:\PrintAgent\PrintAgent.exe"
timeout /t 3 /nobreak > nul
echo Done!
echo.

echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo PrintAgent is now running in the background.
echo Look for the printer icon in your system tray.
echo.
echo To uninstall: Run C:\PrintAgent\uninstall.bat
echo.
pause