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
p.add_argument('--fonetica', default='onnx', choices=['onnx', 'misaki'],
               help="onnx = fonemas do kokoro-onnx (antigo); misaki = mesmo processamento do treino do Kokoro (espeak pt-br com ligaduras: ʤ, ʧ, A...)")
p.add_argument('--sotaque', default='', choices=['', 'cuiabano'],
               help="cuiabano = aproximação: 'ch/x' viram 'tch' e 'j/g' viram 'dj' (chuva → tchuva, gente → djente)")
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

# O Kokoro foi treinado com os fonemas do misaki (EspeakG2P): espeak-ng pt-br com
# ligaduras '^' trocadas por símbolos únicos (d^ʒ → ʤ, t^ʃ → ʧ, e^ɪ → A...). O
# kokoro-onnx fonetiza sem ligaduras e manda 'd','ʒ' e 'e','ɪ' separados, fora do
# que o modelo viu no treino, o que deixa a pronúncia estranha ("de Portugal",
# editor, 29/09). --fonetica misaki refaz o processamento do treino.
E2M = sorted({
    'a^ɪ': 'I', 'a^ʊ': 'W', 'd^z': 'ʣ', 'd^ʒ': 'ʤ', 'e^ɪ': 'A', 'o^ʊ': 'O',
    'ə^ʊ': 'Q', 's^s': 'S', 't^s': 'ʦ', 't^ʃ': 'ʧ', 'ɔ^ɪ': 'Y',
}.items())

def fonemas_misaki(t):
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    from phonemizer.backend import EspeakBackend
    EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    b = EspeakBackend(language='pt-br', preserve_punctuation=True, with_stress=True, tie='^', language_switch='remove-flags')
    t = t.replace('«', '\u201c').replace('»', '\u201d').replace('(', '«').replace(')', '»')
    ps = b.phonemize([t])[0].strip()
    for de, para in E2M:
        ps = ps.replace(de, para)
    ps = ps.replace('^', '').replace('-', '').replace('«', '(').replace('»', ')')
    if a.sotaque == 'cuiabano':
        # africadas do falar cuiabano: ʃ (ch/x) → ʧ e ʒ (j/g) → ʤ; o 's' final
        # sai [s] no espeak pt-br e não é tocado. Só nas palavras comuns: nomes
        # próprios e siglas (inicial maiúscula) ficam na pronúncia padrão, que
        # com o sotaque viravam "Dianaína" e "ODI-MT" na transcrição (29/09).
        # Se as palavras do texto e dos fonemas não casarem uma a uma, o
        # sotaque não é aplicado (melhor sem sotaque que nome trocado).
        import re
        palavras = re.findall(r"[0-9A-Za-zÀ-ÿ]+(?:[-'][0-9A-Za-zÀ-ÿ]+)*", t)
        blocos = ps.split(' ')
        fon = [i for i, b in enumerate(blocos) if re.search(r'[^\s.,;:!?"“”()—…]', b)]
        if len(palavras) == len(fon):
            for w, i in zip(palavras, fon):
                if not w[0].isupper():
                    blocos[i] = blocos[i].replace('ʃ', 'ʧ').replace('ʒ', 'ʤ')
            ps = ' '.join(blocos)
        else:
            print(f'aviso: sotaque não aplicado ({len(palavras)} palavras × {len(fon)} blocos de fonemas)', file=sys.stderr)
    return ''.join(c for c in ps if c in k.tokenizer.vocab)

if a.fonetica == 'misaki':
    audio, sr = k.create(fonemas_misaki(texto), voice=voz, speed=a.velocidade, is_phonemes=True)
else:
    if a.sotaque:
        sys.exit('--sotaque precisa de --fonetica misaki')
    audio, sr = k.create(texto, voice=voz, speed=a.velocidade, lang='pt-br')
sf.write(a.saida, audio, sr)
