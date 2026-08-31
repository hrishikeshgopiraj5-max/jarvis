#!/bin/bash
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   J.A.R.V.I.S. Desktop AI Assistant  ║"
echo "╚═══════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

echo "[*] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "[!] Python3 not found. Install with: brew install python3"
    exit 1
fi

echo "[*] Installing dependencies..."
pip3 install -r requirements.txt --quiet 2>/dev/null

echo "[*] Starting J.A.R.V.I.S..."
echo ""
python3 main.py "$@"
