#!/usr/bin/env bash
# Reconstruye muburgers.mx a partir de contenido.json + src/ y deja los archivos publicables en la raíz del repo.
set -e
cd "$(dirname "$0")"
python3 build.py "$@"
echo "OK. Haz commit y push a main para publicar."
