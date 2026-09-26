#!/usr/bin/env python3
"""Embute content/paginas/radar-dados.json na página do Radar Eleitoral.

  python3 radar-build.py            # grava radar-eleitoral.html com os dados atuais
  python3 radar-build.py --checar   # só valida o JSON

Depois publique com: node ../pagina-ghost.mjs --slug=radar-eleitoral --arquivo=paginas/radar-eleitoral.html
Os dados são editoriais (conferidos pela redação ou pela rotina com as mesmas
regras): boletim do Argos, pesquisas registradas, Justiça Eleitoral, grupos e
redes oficiais. Cada item leva fonte com link.
"""
import json, re, sys, os
aqui = os.path.dirname(os.path.abspath(__file__))
dados = json.load(open(os.path.join(aqui, 'radar-dados.json'), encoding='utf-8'))
for k in dados:
    if k not in ('atualizado', 'boletim', 'pesquisas', 'justica', 'grupos', 'redes', 'analise', 'redes_metricas'):
        sys.exit(f'chave inesperada em radar-dados.json: {k}')
if '--checar' in sys.argv:
    print('ok:', ', '.join(sorted(dados))); sys.exit(0)
bloco = json.dumps(dados, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
p = os.path.join(aqui, 'radar-eleitoral.html')
s = open(p, encoding='utf-8').read()
novo, n = re.subn(r'<!--DADOS-->.*?<!--/DADOS-->', lambda m: '<!--DADOS--><script type="application/json" id="rd-dados">' + bloco + '</script><!--/DADOS-->', s, flags=re.S)
if n != 1:
    sys.exit('marcadores <!--DADOS--> não encontrados (ou repetidos)')
open(p, 'w', encoding='utf-8').write(novo)
print(f'radar-eleitoral.html: dados embutidos ({len(bloco)} caracteres)')
