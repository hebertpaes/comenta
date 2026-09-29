#!/usr/bin/env python3
"""Voz neural do narrador pelo serviço de leitura em voz alta da Microsoft
(pacote edge-tts), usado pelo charge-cena.mjs com `voz.motor: "edge"`.

  echo "texto" | python3 lib/edge-tts.py --voz pt-BR-AntonioNeural --velocidade +18% --tom +4Hz --saida fala.mp3

Vozes de pt-BR: AntonioNeural (masculina), FranciscaNeural e
ThalitaMultilingualNeural (femininas) — vozes sintéticas genéricas do
catálogo, que não imitam pessoa real (Res. TSE 23.610/2019, art. 9º-C).
O edge-tts confia no certifi embutido; aqui ele usa o CA do proxy da sessão
(/root/.ccr/ca-bundle.crt, ou $SSL_CERT_FILE) — a verificação TLS continua ligada.
"""
import argparse, asyncio, os, sys

p = argparse.ArgumentParser()
p.add_argument('--voz', default='pt-BR-AntonioNeural')
p.add_argument('--velocidade', default='+0%')
p.add_argument('--tom', default='+0Hz')
p.add_argument('--saida', required=True)
a = p.parse_args()

ca = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
if os.path.exists(ca):
    import certifi
    certifi.where = lambda: ca
try:
    import edge_tts
except ImportError:
    sys.exit('No module named edge_tts (pip install edge-tts)')

texto = sys.stdin.read().strip()
if not texto:
    sys.exit('texto vazio')

async def principal():
    c = edge_tts.Communicate(texto, a.voz, rate=a.velocidade, pitch=a.tom, proxy=os.environ.get('HTTPS_PROXY') or None)
    await c.save(a.saida)

asyncio.run(principal())
if not os.path.exists(a.saida) or os.path.getsize(a.saida) == 0:
    sys.exit('edge-tts não devolveu áudio')
