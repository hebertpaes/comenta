"""Manchetes novas nas páginas de listagem dos veículos de MT (varredura do Radar e dos monitores).

Uso:
  python3 content/tools/manchetes.py <pasta-com-html>            # compara com o estado salvo e imprime as novas
  python3 content/tools/manchetes.py <pasta-com-html> --gravar   # idem e grava as novas como vistas

O estado fica no repositório (content/pautas/radar/manchetes-vistas.json), para que uma
sessão nova saiba o que já foi visto. Mantém só os últimos 4 dias. Cada arquivo da pasta
é a página de listagem de um veículo (nome do arquivo = chave do veículo).
"""
import html
import json
import os
import re
import sys
import time

ESTADO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pautas', 'radar', 'manchetes-vistas.json')
DIAS = 4


def manchetes(arquivo):
    s = open(arquivo, encoding='utf8', errors='ignore').read()
    out = {}
    for m in re.finditer(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', s, re.S):
        t = html.unescape(re.sub(r'<[^>]+>', ' ', m.group(2)))
        t = ' '.join(t.split())
        if 45 <= len(t) <= 220:
            out.setdefault(t, m.group(1))
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pasta = sys.argv[1]
    gravar = '--gravar' in sys.argv
    estado = {}
    if os.path.exists(ESTADO):
        estado = json.load(open(ESTADO, encoding='utf8')).get('vistas', {})
    agora = int(time.time())
    total_novas = 0
    for f in sorted(os.listdir(pasta)):
        if not f.endswith('.html'):
            continue
        novas = [(t, u) for t, u in manchetes(os.path.join(pasta, f)).items() if t not in estado]
        print(f'== {f} novas {len(novas)}')
        for t, u in sorted(novas)[:40]:
            print('  -', t, '|', u[:160])
        for t, _ in novas:
            estado[t] = agora
        total_novas += len(novas)
    if gravar:
        limite = agora - DIAS * 86400
        estado = {t: ts for t, ts in estado.items() if ts >= limite}
        os.makedirs(os.path.dirname(ESTADO), exist_ok=True)
        with open(ESTADO, 'w', encoding='utf8') as fh:
            json.dump({'_comentario': 'Manchetes já vistas pelas rotinas (título -> epoch); gerado por content/tools/manchetes.py; mantém 4 dias.',
                       'vistas': dict(sorted(estado.items()))}, fh, ensure_ascii=False, indent=0)
            fh.write('\n')
    print(f'total de manchetes novas: {total_novas}' + (' (gravadas como vistas)' if gravar else ''))


if __name__ == '__main__':
    main()
