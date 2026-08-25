@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "UV_BIN=uv"
if exist "%USERPROFILE%\.local\bin\uv.exe" set "UV_BIN=%USERPROFILE%\.local\bin\uv.exe"
set "UV_CACHE_DIR=%~dp0.uv-cache"
set "LLMFIT_BIN=llmfit"
if exist "%USERPROFILE%\.local\bin\llmfit.exe" set "LLMFIT_BIN=%USERPROFILE%\.local\bin\llmfit.exe"
"%LLMFIT_BIN%" --version >nul 2>nul
if errorlevel 1 (
  echo [LLMFit] 未找到官方 llmfit 命令。
  echo [LLMFit] 请先执行：uv tool install -U llmfit
  pause
  exit /b 1
)
echo [LLMFit] 正在启动本地看板，浏览器将自动打开……
"%UV_BIN%" run llmfit-dashboard
if errorlevel 1 (
  echo.
  echo [LLMFit] 看板已退出，请查看上面的错误信息。
  pause
)
