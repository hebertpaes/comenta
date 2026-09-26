import base64, json, os
S = '/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad'
fontes = ''.join(
    "@font-face{font-family:Inter;font-weight:%d;src:url(data:font/woff2;base64,%s) format('woff2')}" % (w, base64.b64encode(open(f'{S}/fonts/inter-{w}.woff2','rb').read()).decode())
    for w in (400, 600, 700, 800))

# 2ª rodada Quaest (21-24/09/2026, MT-08098/2026) conferida em RDNews, Olhar Direto e Gazeta do Povo;
# agosto (21-24/08/2026, MT-04846/2026) conferido em Olhar Direto, Mato Grosso ao Vivo e CircuitoMT (só os 5 primeiros).
CONS = [  # nome, partido, set, ago
    ('Mauro Mendes', 'União', 27, 24), ('Janaina Riva', 'MDB', 19, 18),
    ('Pedro Taques', 'PSB', 9, 8), ('Zé Medeiros', 'PL', 9, 6), ('Fávaro', 'PSD', 8, 5),
    ('Galvan', 'Avante', 2, None), ('Coronel Darwin', 'Democrata', 1, None),
    ('Margareth Buzetti', 'PP', 1, None), ('Prof. Nelson Ferreira', 'Agir', 1, None),
    ('Beny Godoy', 'Agir', 0, None),
]
OUTROS_C = [('Branco, nulo ou não vai votar', 5), ('Indecisos', 18)]
V1 = [('Mauro Mendes', 'União', 37), ('Janaina Riva', 'MDB', 19), ('Zé Medeiros', 'PL', 11), ('Pedro Taques', 'PSB', 8), ('Fávaro', 'PSD', 8)]
V1o = [('Demais candidatos', '0% a 1% cada'), ('Branco ou nulo', 3), ('Indecisos', 11)]
V2 = [('Janaina Riva', 'MDB', 20), ('Mauro Mendes', 'União', 16), ('Pedro Taques', 'PSB', 10), ('Zé Medeiros', 'PL', 8), ('Fávaro', 'PSD', 7)]
V2o = [('Demais candidatos', '1% a 3% cada'), ('Branco ou nulo', 6), ('Indecisos', 25)]
FICHA = ('Pesquisa Quaest contratada pela Rádio e Televisão Matogrossense Ltda. (TV Centro América) · 804 entrevistas '
         'de 21 a 24/09/2026 · margem de erro de 3 pontos, confiança de 95% · registro no TSE: MT-08098/2026')

CSS = fontes + """
*{box-sizing:border-box;margin:0;padding:0}
body{width:%(w)dpx;height:%(h)dpx;font-family:Inter,sans-serif;background:#fff;color:#111;display:flex;flex-direction:column;overflow:hidden}
.top{background:#0a2e1f;background:linear-gradient(135deg,#0a2e1f,#0f4a33);color:#fff;padding:%(pt)dpx %(px)dpx %(pb)dpx}
.k{font-size:%(fk)dpx;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7ff0b8}
h1{font-size:%(fh)dpx;line-height:1.08;font-weight:800;margin-top:%(g1)dpx;letter-spacing:-.01em}
.sub{font-size:%(fs)dpx;color:#d4ebe0;margin-top:%(g2)dpx;line-height:1.3}
.corpo{flex:1;padding:%(bt)dpx %(px)dpx 0;display:flex;flex-direction:column;min-height:0}
.leg{display:flex;gap:%(g3)dpx;font-size:%(fl)dpx;color:#3f4a45;margin-bottom:%(g2)dpx;align-items:center;flex-wrap:wrap}
.leg i{display:inline-block;vertical-align:middle;margin-right:8px}
.sw{width:%(fl)dpx;height:%(fl)dpx;border-radius:4px;background:#0b7a45}
.tk{width:4px;height:%(fl)dpx;border-radius:2px;background:#111}
.lin{display:grid;grid-template-columns:%(lw)dpx 1fr;align-items:center;column-gap:%(g3)dpx;height:%(rh)dpx}
.nm{font-size:%(fn)dpx;font-weight:700;text-align:right;line-height:1.1}
.nm small{display:block;font-size:%(fp)dpx;font-weight:400;color:#5b6762;margin-top:2px}
.tr{height:%(bh)dpx}
.area{position:relative;height:100%%;width:calc(100%% - %(res)dpx)}
.b{position:absolute;left:0;top:0;height:100%%;border-radius:0 4px 4px 0;background:#0b7a45;min-width:3px}
.b.g{background:#b9c6bf}
.v{position:absolute;top:50%%;transform:translateY(-50%%);font-size:%(fv)dpx;font-weight:800;margin-left:10px;white-space:nowrap}
.v small{font-size:%(fp)dpx;font-weight:600;color:#5b6762;margin-left:8px}
.ago{position:absolute;top:-5px;bottom:-5px;width:4px;border-radius:2px;background:#111;margin-left:-2px}
.miud{font-size:%(fp)dpx;color:#3f4a45;line-height:1.45;margin:4px 0 0}
.miud b{color:#111}
.sep{height:1px;background:#d9e2dd;margin:%(g2)dpx 0}
.emp{position:absolute;right:0;border-left:3px solid #7d8c85;border-top:3px solid #7d8c85;border-bottom:3px solid #7d8c85;border-radius:6px 0 0 6px;width:14px}
.empt{position:absolute;right:22px;font-size:%(fp)dpx;font-weight:700;color:#3f4a45;text-align:right;line-height:1.2}
.rod{padding:%(g2)dpx %(px)dpx %(pbb)dpx;font-size:%(fr)dpx;color:#5b6762;line-height:1.35;border-top:1px solid #d9e2dd;margin-top:auto}
.rod b{color:#0a2e1f}
.duas{display:grid;grid-template-columns:%(cols)s;gap:%(g3)dpx %(gx)dpx;flex:1;min-height:0}
.pn h2{font-size:%(fn2)dpx;font-weight:800;margin-bottom:%(g2)dpx;color:#0a2e1f}
.pn h2 small{font-weight:600;color:#5b6762;font-size:%(fp)dpx;margin-left:8px}
.out{font-size:%(fp)dpx;color:#3f4a45;margin-top:8px;line-height:1.45}
"""

def trilho(v, maxv, cls='', ago=None, extra=''):
    x = v / maxv * 100
    h = '<div class="tr"><div class="area">'
    if v: h += '<div class="b %s" style="width:%.2f%%"></div>' % (cls, x)
    if ago is not None: h += '<i class="ago" style="left:%.2f%%"></i>' % (ago / maxv * 100)
    h += '<span class="v" style="left:%.2f%%">%d%%%s</span></div></div>' % (x, v, extra)
    return h

def consolidado(p, compacto):
    maxv = 30
    h = ''
    for i, (n, pt, v, a) in enumerate(CONS):
        if compacto and i >= 5: continue
        extra = '<small>ago: %d%%</small>' % a if a is not None else ''
        h += '<div class="lin"><div class="nm">%s<small>%s</small></div>%s</div>' % (n, pt, trilho(v, maxv, '', a, extra))
        if i == 4 and not compacto: h += '<div class="sep"></div>'
    if compacto:
        h += '<p class="miud" style="margin-left:%dpx">Demais: Galvan (Avante) <b>2%%</b> · Coronel Darwin (Democrata), Margareth Buzetti (PP) e Prof. Nelson Ferreira (Agir) <b>1%%</b> cada · Beny Godoy (Agir) <b>0%%</b></p>' % (p['lw'] + p['g3'])
    h += '<div class="sep"></div>'
    for n, v in OUTROS_C:
        h += '<div class="lin"><div class="nm" style="font-weight:600;color:#3f4a45">%s</div>%s</div>' % (n, trilho(v, maxv, 'g'))
    return h

def painel(tit, sub, dados, outros, maxv=40):
    h = '<div class="pn"><h2>%s<small>%s</small></h2>' % (tit, sub)
    for n, pt, v in dados:
        h += '<div class="lin"><div class="nm">%s<small>%s</small></div>%s</div>' % (n, pt, trilho(v, maxv))
    h += '<div class="out">' + ' · '.join('%s: <b>%s</b>' % (n, v if isinstance(v, str) else '%d%%' % v) for n, v in outros) + '</div></div>'
    return h

def pagina(kind, w, h):
    vert = h > w
    p = dict(w=w, h=h, px=56 if vert else 64, pt=48 if vert else 40, pb=36 if vert else 30, fk=24 if vert else 22,
             fh=58 if vert else 52, fs=27 if vert else 24, g1=10, g2=14 if vert else 12, g3=18, bt=30 if vert else 24,
             fl=22 if vert else 20, lw=250 if vert else 280, rh=(67 if kind=='cons' else 62) if vert else (54 if kind=='cons' else 74),
             bh=30 if vert else (24 if kind=='cons' else 28), fn=25 if vert else 22, fp=18 if vert else 16, fv=28 if vert else 24, fr=17 if vert else 16,
             pbb=34 if vert else 22, fn2=30 if vert else 26, gx=40, cols='1fr' if vert else '1fr 1fr', res=(190 if vert else 200) if kind=='cons' else 70)
    if kind == 'cons':
        top = ('Pesquisa Quaest · Senado · Mato Grosso', 'Mauro e Janaina seguem na frente',
               'Voto consolidado (soma do 1º e do 2º voto): cada eleitor escolhe dois nomes para as duas vagas.')
        leg = '<div class="leg"><span><i class="sw"></i>Setembro (21 a 24/09)</span><span><i class="tk"></i>Agosto (21 a 24/08), para os cinco primeiros</span></div>'
        corpo = leg + '<div style="position:relative">' + consolidado(p, not vert) + '</div>'
    else:
        top = ('Pesquisa Quaest · Senado · Mato Grosso', 'No 1º voto, Mauro; no 2º, Janaina',
               'Cada eleitor vota em dois candidatos. Veja como fica cada escolha separada.')
        corpo = '<div class="duas">' + painel('1º voto', 'setembro', V1, V1o) + painel('2º voto', 'setembro', V2, V2o) + '</div>'
    return ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>' + CSS % p + '</style></head><body>'
            '<div class="top"><div class="k">%s</div><h1>%s</h1><div class="sub">%s</div></div>' % top +
            '<div class="corpo">' + corpo + '</div>'
            '<div class="rod">' + FICHA + '<br><b>Arte: HOJE MT · hojemt.com.br</b></div></body></html>')

saidas = {
    'quaest-senado-consolidado-16x9': ('cons', 1600, 900),
    'quaest-senado-votos-16x9': ('votos', 1600, 900),
    'quaest-senado-consolidado-4x5': ('cons', 1080, 1350),
    'quaest-senado-votos-4x5': ('votos', 1080, 1350),
}
for nome, (k, w, h) in saidas.items():
    open(f'{S}/quaest/{nome}.html', 'w').write(pagina(k, w, h))
json.dump({n: [w, h] for n, (k, w, h) in saidas.items()}, open(f'{S}/quaest/saidas.json', 'w'))
print('ok')
