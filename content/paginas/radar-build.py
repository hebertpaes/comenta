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
# Medição automática pelas APIs oficiais (gerada por ../redes-api.mjs). Só os
# números entram na página: mensagens de erro e @ ficam de fora.
api_p = os.path.join(aqui, 'radar-redes-api.json')
if os.path.exists(api_p):
    api = json.load(open(api_p, encoding='utf-8'))
    NUM = {'instagram': ('seguidores', 'publicacoes', 'posts_7d', 'interacoes_7d', 'media_por_post_7d', 'engajamento_pct', 'perfil', 'melhor_7d'),
           'youtube': ('inscritos', 'videos', 'visualizacoes_total', 'visualizacoes_7d', 'posts_7d', 'interacoes_7d', 'engajamento_pct', 'perfil', 'melhor_7d'),
           'x': ('seguidores', 'posts_total', 'posts_7d', 'interacoes_7d', 'media_por_post_7d', 'engajamento_pct', 'perfil', 'melhor_7d'),
           'anuncios': ('anuncios_desde_16_08', 'gasto_min', 'gasto_max', 'impressoes_min', 'impressoes_max')}
    cands = {}
    for nome, c in api.get('candidatos', {}).items():
        o = {'cargo': c.get('cargo')}
        for prov, campos in NUM.items():
            v = c.get(prov)
            if isinstance(v, dict) and 'erro' not in v and not v.get('seco'):
                o[prov] = {k: v[k] for k in campos if k in v}
        cands[nome] = o
    dados['redes_api'] = {'coletado_em': api.get('coletado_em'),
                          'provedores': {k: v.get('status') for k, v in api.get('provedores', {}).items()},
                          'candidatos': cands}
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
