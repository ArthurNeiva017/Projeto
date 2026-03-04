#!/bin/bash
echo "========================================================"
echo "       Cyber Threat Hub - Inicializador para TCC"
echo "========================================================"
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR/backend"

echo "[1/2] Verificando/Instalando dependencias do Node..."
npm install --silent > /dev/null 2>&1

echo "[2/2] Abrindo navegador e iniciando servidor..."
echo ""
echo "O painel estara disponivel em: http://localhost:3001"
echo "Para encerrar, aperte CTRL+C nesta janela."
echo ""

if which xdg-open > /dev/null; then
  xdg-open http://localhost:3001 &
elif which open > /dev/null; then
  open http://localhost:3001 &
fi

node src/server.js
