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
p.add_argument('--qualidade', default='96', choices=['48', '96'],
               help='kbps do MP3 de 24 kHz pedido ao serviço (96 desde a voz v7, 02/10/2026; 48 é o padrão do pacote)')
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

# O pacote fixa o formato "audio-24khz-48kbitrate-mono-mp3"; o serviço também
# aceita o de 96 kbps (testado em 02/10/2026: menos artefato de compressão,
# DNSMOS um pouco maior). Troca só essa string na mensagem de configuração.
FORMATO_PADRAO = 'audio-24khz-48kbitrate-mono-mp3'
FORMATO = {'48': FORMATO_PADRAO, '96': 'audio-24khz-96kbitrate-mono-mp3'}[a.qualidade]
if FORMATO != FORMATO_PADRAO:
    import aiohttp
    _orig = aiohttp.ClientWebSocketResponse.send_str
    async def _send_str(self, data, *args, **kw):
        if f'"outputFormat":"{FORMATO_PADRAO}"' in data:
            data = data.replace(FORMATO_PADRAO, FORMATO)
        return await _orig(self, data, *args, **kw)
    aiohttp.ClientWebSocketResponse.send_str = _send_str

async def principal():
    c = edge_tts.Communicate(texto, a.voz, rate=a.velocidade, pitch=a.tom, proxy=os.environ.get('HTTPS_PROXY') or None)
    await c.save(a.saida)

try:
    asyncio.run(principal())
except edge_tts.exceptions.NoAudioReceived:
    if FORMATO == FORMATO_PADRAO:
        raise
    # o serviço recusou o formato de 96 kbps: refaz no padrão, avisando
    print('AVISO: formato de 96 kbps recusado; usando 48 kbps', file=sys.stderr)
    aiohttp.ClientWebSocketResponse.send_str = _orig
    asyncio.run(principal())
if not os.path.exists(a.saida) or os.path.getsize(a.saida) == 0:
    sys.exit('edge-tts não devolveu áudio')
