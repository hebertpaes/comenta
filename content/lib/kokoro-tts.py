#!/usr/bin/env python3
"""Voz do narrador com o Kokoro-82M (Apache-2.0), usado pelo charge-cena.mjs.

  echo "texto" | python3 lib/kokoro-tts.py --voz pm_santa --saida fala.wav [--velocidade 1]

Modelo e vozes em $HOJEMT_VOZES/kokoro (model.onnx + <voz>.bin), baixados por
../vozes-kokoro.sh. As vozes do Kokoro são sintéticas genéricas: nunca imitam
pessoa real (Res. TSE 23.610/2019, art. 9º-C).
"""
import argparse, os, sys

p = argparse.ArgumentParser()
p.add_argument('--voz', default='pm_santa')
p.add_argument('--velocidade', type=float, default=1.0)
p.add_argument('--saida', required=True)
p.add_argument('--pasta', default=os.path.join(os.environ.get('HOJEMT_VOZES', os.path.expanduser('~/.local/share/hojemt-vozes')), 'kokoro'))
a = p.parse_args()

modelo = os.path.join(a.pasta, 'model.onnx')
# --voz aceita uma voz ("pm_santa") ou uma mistura com pesos ("pm_santa:0.7,am_onyx:0.3");
# a mistura é a média ponderada dos vetores de estilo e a fonética segue em pt-br.
mistura = [(n.split(':')[0].strip(), float(n.split(':')[1]) if ':' in n else 1.0) for n in a.voz.split(',') if n.strip()]
for f in [modelo] + [os.path.join(a.pasta, f'{n}.bin') for n, _ in mistura]:
    if not os.path.exists(f):
        sys.exit(f'arquivo do Kokoro não encontrado: {f} (rode: bash vozes-kokoro.sh)')
try:
    import numpy as np, soundfile as sf
    from kokoro_onnx import Kokoro
except ImportError as e:
    sys.exit(f'No module named {e.name} (rode: bash vozes-kokoro.sh)')

# O kokoro-onnx lê as vozes de um .npz; as do Hugging Face vêm uma por arquivo.
pacote = os.path.join(a.pasta, 'vozes.npz')
bins = sorted(f[:-4] for f in os.listdir(a.pasta) if f.endswith('.bin'))
if not os.path.exists(pacote) or set(np.load(pacote).files) != set(bins):
    np.savez(pacote, **{n: np.fromfile(os.path.join(a.pasta, n + '.bin'), dtype=np.float32).reshape(-1, 1, 256) for n in bins})

texto = sys.stdin.read().strip()
if not texto:
    sys.exit('texto vazio')
k = Kokoro(modelo, pacote)
if len(mistura) == 1:
    voz = mistura[0][0]
else:
    total = sum(p for _, p in mistura)
    voz = sum(k.get_voice_style(n) * (p / total) for n, p in mistura).astype(np.float32)
audio, sr = k.create(texto, voice=voz, speed=a.velocidade, lang='pt-br')
sf.write(a.saida, audio, sr)
