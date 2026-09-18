@echo off
setlocal
cd /d "%~dp0"
if not exist "BDS_Sync.exe" exit /b 0
start /wait "" "%~dp0BDS_Sync.exe" --uninstall
