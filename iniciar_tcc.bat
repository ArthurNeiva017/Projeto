@echo off
echo ========================================================
echo        Cyber Threat Hub - Inicializador para TCC
echo ========================================================
echo.
cd %~dp0\backend

echo [1/2] Verificando/Instalando dependencias do Node...
call npm install >nul 2>&1

echo [2/2] Abrindo navegador e iniciando servidor...
echo.
echo O painel estara disponivel em: http://localhost:3001
echo Para encerrar, aperte CTRL+C nesta janela.
echo.

start http://localhost:3001
node src/server.js
