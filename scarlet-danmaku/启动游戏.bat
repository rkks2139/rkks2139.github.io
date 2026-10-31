@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8137

where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set PY=python
  ) else (
    echo 未找到 Python，直接打开 index.html 也可以游玩。
    start "" "index.html"
    exit /b
  )
)

start "" "http://127.0.0.1:%PORT%/"
%PY% -m http.server %PORT% --bind 127.0.0.1
