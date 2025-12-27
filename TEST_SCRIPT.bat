@echo off
echo Testing PowerShell script syntax...
echo.
powershell -NoProfile -Command "& { $ErrorActionPreference = 'Stop'; try { $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content 'setup-cloudflare-tunnel.ps1' -Raw), [ref]$null); Write-Host 'SUCCESS: Script syntax is valid!' -ForegroundColor Green } catch { Write-Host 'ERROR: Script has syntax errors!' -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Yellow } }"
echo.
pause









