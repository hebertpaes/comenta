#!/usr/bin/env python3
"""Banner "Combo Vitalício ABACS" (todos os cursos), no padrão visual das peças
ABACS (azul-marinho + laranja, Anton + Roboto Condensed).

    python3 scripts/gerar_banner_combo_vitalicio.py

Gera em assets/abacs/:
    combo-vitalicio-1200x640.png   pop-up do site (mesma proporção do pop-up atual)
    combo-vitalicio-1080x1350.png  feed do Instagram

Sem preço de propósito: incluir só quando o valor oficial do combo for definido
(parâmetro --preco "R$ ...").
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTES = os.path.join(RAIZ, "content", "assets", "fonts")
SAIDA = os.path.join(RAIZ, "assets", "abacs")

AZUL = (15, 31, 74)
AZUL_CLARO = (160, 178, 226)
LARANJA = (255, 122, 26)
AMARELO = (255, 214, 64)
BRANCO = (255, 255, 255)
BORDA_CHIP = (52, 76, 140)

CATEGORIAS = ["Administrativo", "Informática", "Idiomas", "Preparatórios",
              "Indústria e NR", "Tecnologia"]


def anton(tam):
    return ImageFont.truetype(os.path.join(FONTES, "Anton-Regular.ttf"), tam)


def roboto(tam, peso="Bold"):
    f = ImageFont.truetype(os.path.join(FONTES, "RobotoCondensed[wght].ttf"), tam)
    f.set_variation_by_name(peso)
    return f


def chapeu(d, x, y, lado):
    """Ícone de capelo (formatura) num quadrado laranja, como nas peças ABACS."""
    d.rectangle([x, y, x + lado, y + lado], fill=LARANJA)
    cx, cy, s = x + lado / 2, y + lado / 2, lado / 64
    d.polygon([(cx - 22 * s, cy - 4 * s), (cx, cy - 14 * s), (cx + 22 * s, cy - 4 * s),
               (cx, cy + 6 * s)], outline=AZUL, width=max(2, int(3 * s)))
    d.line([(cx - 12 * s, cy + 1 * s), (cx - 12 * s, cy + 11 * s)], fill=AZUL, width=max(2, int(3 * s)))
    d.line([(cx + 12 * s, cy + 1 * s), (cx + 12 * s, cy + 11 * s)], fill=AZUL, width=max(2, int(3 * s)))
    d.arc([cx - 12 * s, cy + 3 * s, cx + 12 * s, cy + 17 * s], 0, 180, fill=AZUL, width=max(2, int(3 * s)))


def chips(d, x, y, larg_max, fonte, gap=12, pad=(18, 9)):
    cx, cy = x, y
    alt = fonte.size + 2 * pad[1] + 4
    for c in CATEGORIAS:
        w = d.textlength(c, font=fonte) + 2 * pad[0]
        if cx + w > x + larg_max:
            cx, cy = x, cy + alt + gap
        d.rectangle([cx, cy, cx + w, cy + alt], outline=BORDA_CHIP, width=2)
        d.text((cx + pad[0], cy + pad[1]), c, font=fonte, fill=AZUL_CLARO)
        cx += w + gap
    return cy + alt


def infinito(d, cx, cy, r, cor, esp):
    """Símbolo de infinito (lemniscata de Bernoulli), traço liso feito de discos."""
    import math
    raio = esp / 2
    for i in range(0, 1440):
        t = math.radians(i / 4)
        den = 1 + math.sin(t) ** 2
        x = cx + 2 * r * math.cos(t) / den
        y = cy + 2 * r * math.sin(t) * math.cos(t) / den
        d.ellipse([x - raio, y - raio, x + raio, y + raio], fill=cor)


def horizontal(preco):
    W, H = 1200, 640
    im = Image.new("RGB", (W, H), AZUL)
    d = ImageDraw.Draw(im)
    painel = 820
    d.rectangle([painel, 0, W, H], fill=LARANJA)

    chapeu(d, 60, 48, 64)
    d.text((140, 50), "ABACS", font=anton(52), fill=BRANCO)
    d.text((140 + d.textlength("ABACS", font=anton(52)) + 18, 70), "CAPACITAÇÃO SOLIDÁRIA",
           font=roboto(20, "SemiBold"), fill=AZUL_CLARO)

    d.rectangle([60, 146, 60 + 290, 196], fill=AMARELO)
    d.text((78, 152), "COMBO VITALÍCIO", font=roboto(32, "ExtraBold"), fill=AZUL)

    d.text((60, 214), "TODOS OS CURSOS.", font=anton(84), fill=BRANCO)
    d.text((60, 312), "PARA SEMPRE.", font=anton(84), fill=LARANJA)

    d.text((60, 432), "Mais de 120 cursos online com certificado",
           font=roboto(30, "Medium"), fill=AZUL_CLARO)
    chips(d, 60, 488, painel - 110, roboto(21, "SemiBold"))

    cx = painel + (W - painel) / 2
    infinito(d, cx, 175, 52, AZUL, 16)
    t1 = "ACESSO"
    t2 = "VITALÍCIO"
    d.text((cx - d.textlength(t1, font=anton(58)) / 2, 250), t1, font=anton(58), fill=BRANCO)
    d.text((cx - d.textlength(t2, font=anton(58)) / 2, 318), t2, font=anton(58), fill=BRANCO)
    if preco:
        d.text((cx - d.textlength(preco, font=anton(64)) / 2, 400), preco, font=anton(64), fill=AZUL)
    else:
        sub = "Pague uma vez, estude sempre"
        d.text((cx - d.textlength(sub, font=roboto(24, "Bold")) / 2, 408), sub,
               font=roboto(24, "Bold"), fill=AZUL)
    bx0, by0, bx1, by1 = painel + 40, 480, W - 40, 552
    d.rectangle([bx0, by0, bx1, by1], fill=AZUL)
    cta = "QUERO O COMBO"
    d.text(((bx0 + bx1) / 2 - d.textlength(cta, font=roboto(28, "ExtraBold")) / 2, by0 + 18), cta,
           font=roboto(28, "ExtraBold"), fill=BRANCO)
    site = "abacs.org.br"
    d.text((cx - d.textlength(site, font=roboto(22, "SemiBold")) / 2, 572), site,
           font=roboto(22, "SemiBold"), fill=AZUL)
    return im


def vertical(preco):
    W, H = 1080, 1350
    im = Image.new("RGB", (W, H), AZUL)
    d = ImageDraw.Draw(im)

    chapeu(d, W / 2 - 48, 70, 96)
    t = "ABACS"
    d.text((W / 2 - d.textlength(t, font=anton(78)) / 2, 180), t, font=anton(78), fill=BRANCO)
    t = "CAPACITAÇÃO SOLIDÁRIA"
    d.text((W / 2 - d.textlength(t, font=roboto(26, "SemiBold")) / 2, 290), t,
           font=roboto(26, "SemiBold"), fill=AZUL_CLARO)

    t = "COMBO VITALÍCIO"
    f = roboto(44, "ExtraBold")
    w = d.textlength(t, font=f) + 60
    d.rectangle([W / 2 - w / 2, 356, W / 2 + w / 2, 426], fill=AMARELO)
    d.text((W / 2 - d.textlength(t, font=f) / 2, 364), t, font=f, fill=AZUL)

    for i, (t, cor) in enumerate([("TODOS OS CURSOS.", BRANCO), ("PARA SEMPRE.", LARANJA)]):
        d.text((W / 2 - d.textlength(t, font=anton(118)) / 2, 448 + i * 138), t, font=anton(118), fill=cor)

    t = "Mais de 120 cursos online com certificado"
    d.text((W / 2 - d.textlength(t, font=roboto(38, "Medium")) / 2, 770), t,
           font=roboto(38, "Medium"), fill=AZUL_CLARO)

    d.rectangle([140, 840, W - 140, 1080], fill=LARANJA)
    infinito(d, W / 2, 895, 44, AZUL, 14)
    t = "ACESSO VITALÍCIO"
    d.text((W / 2 - d.textlength(t, font=anton(64)) / 2, 935), t, font=anton(64), fill=BRANCO)
    t = preco or "Pague uma vez, estude sempre"
    f = anton(60) if preco else roboto(32, "Bold")
    d.text((W / 2 - d.textlength(t, font=f) / 2, 1025 - (18 if preco else 0)), t, font=f, fill=AZUL)

    d.rectangle([240, 1110, W - 240, 1196], fill=AMARELO)
    t = "QUERO O COMBO"
    d.text((W / 2 - d.textlength(t, font=roboto(40, "ExtraBold")) / 2, 1130), t,
           font=roboto(40, "ExtraBold"), fill=AZUL)
    t = "abacs.org.br"
    d.text((W / 2 - d.textlength(t, font=roboto(32, "SemiBold")) / 2, 1230), t,
           font=roboto(32, "SemiBold"), fill=BRANCO)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preco", default="", help='ex.: "R$ 197" (vazio = sem preço)')
    a = ap.parse_args()
    os.makedirs(SAIDA, exist_ok=True)
    for nome, im in (("combo-vitalicio-1200x640.png", horizontal(a.preco)),
                     ("combo-vitalicio-1080x1350.png", vertical(a.preco))):
        caminho = os.path.join(SAIDA, nome)
        im.save(caminho, optimize=True)
        print(caminho, im.size, os.path.getsize(caminho) // 1024, "KB")


if __name__ == "__main__":
    main()
