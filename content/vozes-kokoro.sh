#!/usr/bin/env bash
# Baixa a voz do narrador (Kokoro-82M, Apache-2.0) para $HOJEMT_VOZES/kokoro e
# instala o kokoro-onnx. Uma vez por máquina; o charge-cena.mjs usa com
# "voz": {"motor": "kokoro", "narrador": "pm_santa"}.
set -euo pipefail
DEST="${HOJEMT_VOZES:-$HOME/.local/share/hojemt-vozes}/kokoro"
BASE="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main"
mkdir -p "$DEST"
python3 -c "import kokoro_onnx, soundfile" 2>/dev/null || pip install -q kokoro-onnx soundfile
[ -s "$DEST/model.onnx" ] || curl -fL --retry 3 -o "$DEST/model.onnx" "$BASE/onnx/model.onnx"
for v in pm_santa pm_alex pf_dora; do
  [ -s "$DEST/$v.bin" ] || curl -fL --retry 3 -o "$DEST/$v.bin" "$BASE/voices/$v.bin"
done
echo "Kokoro pronto em $DEST"
