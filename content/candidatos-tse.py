"""Montagem de candidatos com foto oficial do TSE (capas de matérias de eleições).

  python3 candidatos-tse.py lista <uf> [cargo]   # lista do espelho ND Mais (fotos do TSE), ordem alfabética
  python3 candidatos-tse.py ops <spec.json>      # operações do edit-design (Canva) para a montagem

O DivulgaCand/cdn.tse.jus.br bloqueiam acesso de fora do Brasil; o ND Mais publica as
mesmas fotos oficiais (F<UF><SQ>_div.jpg). Cargos: governador, senador, presidente (uf=br).
A lista traz a situação do registro: exclua indeferidos/renúncias e confira com a matéria.

O `ops` usa o modelo Canva DAHWH1j1gbI (montagem do Senado por MT, 10 vagas: cabeçalho
de 100 px + grade). Até 5 candidatos: uma fileira de 800 px de altura; de 6 a 10: duas
fileiras de 400 px (a de baixo centralizada). Spec: {titulo, subtitulo, alt_cargo,
design_titulo, candidatos: [{nome_urna, partido_fmt, canva}]} em ordem alfabética.
Com "encaixe": "inteiro" no spec, cada foto aparece inteira (sem corte), centralizada na
célula sobre o fundo verde — use quando as fotos do TSE forem muito fechadas (rosto
cortado pelo recorte padrão), como na montagem da Bahia de 25/09/2026.
"""
import html, json, math, re, sys, unicodedata, urllib.request

PARTIDOS = {'UNIÃO': 'União', 'DEMOCRATA': 'Democrata', 'MISSÃO': 'Missão', 'NOVO': 'Novo', 'AGIR': 'Agir',
            'AVANTE': 'Avante', 'REPUBLICANOS': 'Republicanos', 'SOLIDARIEDADE': 'Solidariedade',
            'CIDADANIA': 'Cidadania', 'MOBILIZA': 'Mobiliza', 'PODE': 'Podemos'}


def chave(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().casefold()


def lista(uf, cargo='governador'):
    url = f"https://ndmais.com.br/eleicoes/2026/candidatos/{uf.lower()}/{cargo}/"
    t = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=40).read().decode('utf-8', 'ignore')
    out = []
    for m in re.finditer(r'<a href="([^"]+)" class="card card-candidato[^"]*"[^>]*data-nome="([^"]*)" data-numero="([^"]*)" '
                         r'data-partido="([^"]*)" data-situacao="([^"]*)"[^>]*>\s*<div class="position-relative"><div class="ratio"[^>]*><img src="([^"]+)"', t):
        href, nome, num, part, sit, img = m.groups()
        part = html.unescape(part)
        out.append(dict(nome_urna=html.unescape(nome), numero=num, partido=part, partido_fmt=PARTIDOS.get(part, part),
                        situacao=sit or None, foto=img, sq=re.search(r'F[A-Z]{2}(\d+)_div', img).group(1), perfil=href))
    out.sort(key=lambda c: chave(c['nome_urna']))
    return out


P = ["LBWf96BPXwRSXRcH", "LBsrzp5XGbqqSCzq", "LBK4JrcNZb674wg2", "LBS8H6YbPQYCPBGs", "LBhq4y1JFv6pF95Y", "LBshBLD6BpCSDRwn", "LBV79SYgQsXh3dlV", "LB2QXz9H75h8H161", "LB60snLNCgrW2HsN", "LB0VdwdL6KXvdV9p"]
S = ["LBNcs5yGZlYCHBP8", "LByrGWHYvZwwNNds", "LBjqk9gPNDhFTk9Z", "LBzJ8css5XKwyGCp", "LB8LM9chWzlGSp1K", "LBJL20YxwSttnkn1", "LBh2Zd5GbXKyjxbP", "LBgsS7CR0t6PD7v7", "LBgDjgfLCdpD9g43", "LBwH2nGbHZcDWVyd"]
T = ["LBSq4CWwpk1FGx6g", "LB2ndX5ytF9Bm0L3", "LBhwn23NpHZBKHmj", "LBX24C0J0V7DvjYX", "LBJWWDJ807tdLH6V", "LBPZDR8zN98YdLVF", "LBHFhj6M07j3822k", "LBSyw9G0x0r10LN2", "LBtdTkYN6b4twJBS", "LBrpnwSQs0vKmb75"]


def ops(spec):
    L = lambda i: "PBkYJjcVxtlZC15x-" + i
    c = spec['candidatos']; n = len(c)
    assert 1 <= n <= 10 and all(x.get('canva') for x in c), 'de 1 a 10 candidatos, todos com canva id'
    rows, H = ([n], 800) if n <= 5 else ([math.ceil(n / 2), n - math.ceil(n / 2)], 400)
    W = 1600 / max(rows); out = []; k = 0
    for r, rown in enumerate(rows):
        off = (1600 - rown * W) / 2
        for j in range(rown):
            cand = c[k]; left = round(off + j * W, 2); top = 100 + r * H
            inteiro = spec.get('encaixe') == 'inteiro'
            sc = (min if inteiro else max)(W / 161, H / 225); iw, ih = 161 * sc, 225 * sc
            crop_top = 0 if ih <= H + 1 else -min(0.035 * ih, ih - H)
            pw, pleft = (iw, left + (W - iw) / 2) if inteiro else (W, left)
            label = f"{cand['nome_urna']} · {cand['partido_fmt']}"
            size = 23
            if len(label) * 0.53 * size > W - 16:
                size = max(16, int((W - 16) / (len(label) * 0.53)))
            out += [
                {"type": "update_fill", "locator_id": L(P[k]), "asset_type": "image", "asset_id": cand['canva'],
                 "alt_text": f"{cand['nome_urna']} ({cand['partido_fmt']}), {spec['alt_cargo']}. Foto: TSE/Divulgação"},
                {"type": "resize_element", "locator_id": L(P[k]), "width": round(pw, 2), "height": H},
                {"type": "position_element", "locator_id": L(P[k]), "top": top, "left": round(pleft, 2)},
                {"type": "crop_media", "locator_id": L(P[k]), "top": round(crop_top, 2), "left": round(-(iw - pw) / 2, 2), "width": round(iw, 2), "height": round(ih, 2)},
                {"type": "resize_element", "locator_id": L(S[k]), "width": round(W, 2), "height": 60},
                {"type": "position_element", "locator_id": L(S[k]), "top": top + H - 60, "left": left},
                {"type": "replace_text", "locator_id": L(T[k]), "text": label},
                {"type": "resize_element", "locator_id": L(T[k]), "width": round(W, 2)},
                {"type": "position_element", "locator_id": L(T[k]), "top": top + H - 44 + (23 - size) // 2, "left": left},
            ]
            if size != 23:
                out.append({"type": "format_text", "locator_id": L(T[k]), "formatting": {"font_size": size}})
            k += 1
    for i in range(n, 10):
        out += [{"type": "delete_element", "locator_id": L(x)} for x in (P[i], S[i], T[i])]
    out += [{"type": "replace_text", "locator_id": L("LBbms5kYX0mFjxQR"), "text": spec['titulo']},
            {"type": "replace_text", "locator_id": L("LBZpk2gl8m0zZRxd"), "text": spec['subtitulo']},
            {"type": "update_title", "title": spec['design_titulo']}]
    return out


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'lista':
        print(json.dumps(lista(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'governador'), ensure_ascii=False, indent=1))
    elif len(sys.argv) == 3 and sys.argv[1] == 'ops':
        print(json.dumps(ops(json.load(open(sys.argv[2]))), ensure_ascii=False))
    else:
        sys.exit(__doc__)
