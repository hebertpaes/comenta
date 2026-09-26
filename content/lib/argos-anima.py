#!/usr/bin/env python3
"""Anima o retrato do Argos Veredas (repórter virtual do HOJE MT, criado com IA)
sem modelo externo: só OpenCV + numpy, com variações do mesmo retrato geradas
no Canva (boca entreaberta, boca aberta, olhos fechados).

  # uma vez por avatar: alinha as variações ao retrato e acha boca e olhos
  python3 lib/argos-anima.py preparar --base retrato.png --boca1 boca-entreaberta.png \
      [--boca2 boca-aberta.png] [--olhos olhos-fechados.png] --pasta pautas/videos/argos/anima-v3

  # por cena: clipe 1080x1920 (sem som) que acompanha o áudio da fala
  python3 lib/argos-anima.py animar --pasta pautas/videos/argos/anima-v3 --audio fala.wav \
      --dur 6.4 --saida cena.mp4 [--semente 3]

Como anima: a boca abre conforme o volume da fala (envelope RMS por quadro,
com ataque rápido e soltura lenta), misturando o retrato com as variações só
na região da boca; os olhos piscam em intervalos aleatórios de 2,2 a 5 s; a
cabeça e o tronco têm movimento leve (giro de até ~0,6°, deslocamento de
poucos pixels e respiração), mais um aceno curto quando a fala ganha força.
As máscaras saem da diferença entre cada variação alinhada e o retrato, então
qualquer par gerado do mesmo retrato serve. Nada aqui imita pessoa real: o
Argos é personagem fictício e o vídeo sempre avisa que ele foi criado com IA.
"""
import argparse, json, math, os, subprocess, sys
import numpy as np
import cv2

FFMPEG_CANDIDATOS = [
    os.environ.get("FFMPEG", ""),
    "/root/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",
    "ffmpeg",
]


def ffmpeg():
    for c in FFMPEG_CANDIDATOS:
        if c and (os.path.isfile(c) or c == "ffmpeg"):
            return c
    sys.exit("ffmpeg não encontrado")


# ---------------------------------------------------------------- preparar
def rosto(img):
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    fc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    f = fc.detectMultiScale(cinza, 1.1, 5, minSize=(160, 160))
    if len(f) == 0:
        sys.exit("rosto não encontrado no retrato base")
    return max(f, key=lambda r: r[2] * r[3])  # x, y, w, h


def alinhar(base, var, roi, ignorar=None):
    """Afim de `var` para `base` por ECC na região do rosto (ignorando `ignorar`)."""
    x, y, w, h = roi
    g1 = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    g2 = cv2.cvtColor(var, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    msk = np.zeros(g1.shape, np.uint8)
    msk[y : y + h, x : x + w] = 255
    if ignorar is not None:
        msk[ignorar > 0.05] = 0
    M = np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6)
    try:
        _, M = cv2.findTransformECC(g1, g2, M, cv2.MOTION_AFFINE, crit, msk, 5)
    except cv2.error as e:
        print(f"AVISO: ECC não convergiu ({e}); variação usada sem alinhar", file=sys.stderr)
    return cv2.warpAffine(var, M, (base.shape[1], base.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT), M


def mascara(base, var, zona, limiar=10.0, dilata=18, suave=14, comps=1):
    """Região onde `var` difere de `base` dentro de `zona` (x0,y0,x1,y1), suavizada."""
    x0, y0, x1, y1 = [int(v) for v in zona]
    d = np.abs(base.astype(np.float32) - var.astype(np.float32)).mean(2)
    d = cv2.GaussianBlur(d, (0, 0), 3)
    m = np.zeros(d.shape, np.uint8)
    sub = d[y0:y1, x0:x1]
    m[y0:y1, x0:x1] = (sub > limiar).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    n, rot, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1:
        return np.zeros(d.shape, np.float32)
    maiores = 1 + np.argsort(st[1:, cv2.CC_STAT_AREA])[::-1][:comps]
    m = np.isin(rot, maiores).astype(np.uint8)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilata, dilata)))
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), suave)
    return np.clip(m / max(m.max(), 1e-6), 0, 1)


def casar_cor(base, var, m):
    """Ajusta média/desvio de `var` aos de `base` numa faixa em volta da máscara."""
    anel = (cv2.dilate((m > 0.02).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0) & (m < 0.02)
    if anel.sum() < 500:
        return var
    b = base.astype(np.float32)
    v = var.astype(np.float32)
    for c in range(3):
        mb, sb = b[..., c][anel].mean(), b[..., c][anel].std() + 1e-6
        mv, sv = v[..., c][anel].mean(), v[..., c][anel].std() + 1e-6
        v[..., c] = (v[..., c] - mv) * (sb / sv) + mb
    return np.clip(v, 0, 255).astype(np.uint8)


def preparar(a):
    base = cv2.imread(a.base)
    if base is None:
        sys.exit(f"não li {a.base}")
    x, y, w, h = rosto(base)
    roi = (max(0, x - w // 5), max(0, y - h // 5), int(w * 1.4), int(h * 1.5))
    os.makedirs(a.pasta, exist_ok=True)
    cv2.imwrite(os.path.join(a.pasta, "base.png"), base)
    meta = {"rosto": [int(x), int(y), int(w), int(h)], "variacoes": {}}
    zonas = {
        # boca e queixo: terço de baixo do rosto (o queixo desce quando a boca abre)
        "boca1": (x + 0.18 * w, y + 0.58 * h, x + 0.82 * w, y + 1.18 * h),
        "boca2": (x + 0.18 * w, y + 0.58 * h, x + 0.82 * w, y + 1.18 * h),
        # olhos: faixa entre sobrancelha e maçã do rosto
        "olhos": (x + 0.08 * w, y + 0.22 * h, x + 0.92 * w, y + 0.56 * h),
    }
    for nome in ("boca1", "boca2", "olhos"):
        arq = getattr(a, nome)
        if not arq:
            continue
        var = cv2.imread(arq)
        if var is None or var.shape != base.shape:
            var = cv2.resize(var, (base.shape[1], base.shape[0]), interpolation=cv2.INTER_LANCZOS4)
        # 1ª passada sem máscara; 2ª ignorando a região que muda de propósito
        al, _ = alinhar(base, var, roi)
        m0 = mascara(base, al, zonas[nome], comps=2 if nome == "olhos" else 1)
        al, M = alinhar(base, var, roi, ignorar=m0)
        m = mascara(base, al, zonas[nome], comps=2 if nome == "olhos" else 1)
        al = casar_cor(base, al, m)
        cv2.imwrite(os.path.join(a.pasta, f"{nome}.png"), al)
        cv2.imwrite(os.path.join(a.pasta, f"{nome}-mascara.png"), (m * 255).astype(np.uint8))
        ys, xs = np.where(m > 0.02)
        meta["variacoes"][nome] = {
            "arquivo": f"{nome}.png",
            "mascara": f"{nome}-mascara.png",
            "caixa": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] if len(xs) else None,
            "afim": np.asarray(M).round(4).tolist(),
        }
        print(f"{nome}: caixa {meta['variacoes'][nome]['caixa']}")
    with open(os.path.join(a.pasta, "anima.json"), "w") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"pronto em {a.pasta}")


# ---------------------------------------------------------------- animar
def envelope(audio, sr, fps, n):
    """Abertura da boca por quadro (0–1) a partir do volume da fala."""
    passo = sr / fps
    jan = int(sr * 0.03)
    rms = np.zeros(n, np.float32)
    for i in range(n):
        c = int((i + 0.5) * passo)
        seg = audio[max(0, c - jan // 2) : c + jan // 2]
        rms[i] = np.sqrt((seg**2).mean()) if len(seg) else 0
    db = 20 * np.log10(rms + 1e-6)
    falado = db[db > db.max() - 45]
    topo = np.percentile(falado, 95) if len(falado) else db.max()
    # faixa de 15 dB abaixo do pico e curva 1,3: a boca fecha entre as sílabas
    # (~2,6 fechamentos por segundo na voz do Argos) em vez de ficar sempre aberta
    e = np.clip((db - (topo - 15)) / 15, 0, 1) ** 1.3
    # ataque rápido e soltura quase tão rápida; imagem 1 quadro adiantada em relação ao som
    s = np.zeros_like(e)
    for i in range(n):
        ant = s[i - 1] if i else 0
        k = 0.7 if e[i] > ant else 0.6
        s[i] = ant + k * (e[i] - ant)
    return np.concatenate([s[1:], s[-1:]])


def ruido(t, freqs, fases, pesos):
    return sum(p * math.sin(2 * math.pi * f * t + ph) for f, ph, p in zip(freqs, fases, pesos))


def morfar(A, B, niveis):
    """Quadros intermediários de A para B por fluxo óptico (DIS, do próprio
    OpenCV): cada ponto desliza de onde está em A até onde está em B, sem o
    contorno duplo de uma simples mistura."""
    ga = cv2.cvtColor(A.astype(np.uint8), cv2.COLOR_BGR2GRAY)
    gb = cv2.cvtColor(B.astype(np.uint8), cv2.COLOR_BGR2GRAY)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    f_ab = dis.calc(ga, gb, None)
    f_ba = dis.calc(gb, ga, None)
    h, w = ga.shape
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    saida = []
    A = np.ascontiguousarray(A, np.float32)
    B = np.ascontiguousarray(B, np.float32)
    for al in np.linspace(0, 1, niveis, dtype=np.float32):
        wa = cv2.remap(A, gx - al * f_ab[..., 0], gy - al * f_ab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        wb = cv2.remap(B, gx - (1 - al) * f_ba[..., 0], gy - (1 - al) * f_ba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        saida.append(wa * (1 - al) + wb * al)
    return saida


def cadeia(base, chaves, caixa, niveis=12):
    """Níveis 0–1 de uma região (caixa) passando por base → chave1 → chave2…,
    já recortados e com a máscara aplicada (fora dela fica o retrato)."""
    x0, y0, x1, y1 = caixa
    reg = base[y0:y1, x0:x1]
    quadros = []
    ant = reg
    for img, m in chaves:
        alvo = img[y0:y1, x0:x1]
        mm = m[y0:y1, x0:x1]
        passos = morfar(ant, alvo, niveis)
        if quadros:
            passos = passos[1:]
        quadros += [reg * (1 - mm) + p * mm for p in passos]
        ant = alvo
    return quadros


def animar(a):
    import soundfile as sf

    with open(os.path.join(a.pasta, "anima.json")) as f:
        meta = json.load(f)
    base = cv2.imread(os.path.join(a.pasta, "base.png")).astype(np.float32)
    H, W = base.shape[:2]
    var = {}
    for nome, info in meta["variacoes"].items():
        if not info.get("caixa"):
            continue
        img = cv2.imread(os.path.join(a.pasta, info["arquivo"])).astype(np.float32)
        m = cv2.imread(os.path.join(a.pasta, info["mascara"]), cv2.IMREAD_GRAYSCALE).astype(np.float32)[..., None] / 255
        var[nome] = (info["caixa"], img, m)

    def uniao(nomes):
        cx = [var[n][0] for n in nomes]
        return (min(c[0] for c in cx), min(c[1] for c in cx), max(c[2] for c in cx), max(c[3] for c in cx))

    # níveis pré-calculados: boca (base → entreaberta → aberta) e olhos (base → fechados)
    boca = [n for n in ("boca1", "boca2") if n in var]
    cx_boca = uniao(boca) if boca else None
    niv_boca = cadeia(base, [(var[n][1], var[n][2]) for n in boca], cx_boca) if boca else []
    cx_olhos = var["olhos"][0] if "olhos" in var else None
    niv_olhos = cadeia(base, [(var["olhos"][1], var["olhos"][2])], cx_olhos, niveis=8) if "olhos" in var else []

    def nivel(niveis, v):
        pos = min(max(v, 0.0), 1.0) * (len(niveis) - 1)
        i = int(pos)
        if i >= len(niveis) - 1:
            return niveis[-1]
        k = pos - i
        return niveis[i] * (1 - k) + niveis[i + 1] * k

    fps = a.fps
    n = int(round(a.dur * fps))
    audio, sr = sf.read(a.audio, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(1)
    abre = envelope(audio, sr, fps, n)
    rng = np.random.default_rng(a.semente)

    # piscadas: 2,2–5 s entre elas, cada uma em 5 quadros
    pisca = np.zeros(n, np.float32)
    forma = [0.35, 0.85, 1.0, 0.65, 0.25]
    t = rng.uniform(0.5, 1.8)
    while t < a.dur:
        i = int(t * fps)
        for k, v in enumerate(forma):
            if i + k < n:
                pisca[i + k] = max(pisca[i + k], v)
        t += rng.uniform(2.2, 5.0)

    fx, fy, fw, fh = meta["rosto"]
    pivo = (fx + fw / 2, fy + fh * 1.1)  # pescoço
    fases = rng.uniform(0, 2 * math.pi, 9)
    energia = np.convolve(abre, np.ones(12) / 12, mode="same")  # fala "com força" → aceno

    proc = subprocess.Popen(
        [ffmpeg(), "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
         "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", a.saida],
        stdin=subprocess.PIPE,
    )
    for i in range(n):
        t = i / fps
        q = base.copy()
        o = float(abre[i])
        if niv_boca:
            x0, y0, x1, y1 = cx_boca
            q[y0:y1, x0:x1] = nivel(niv_boca, o if len(boca) > 1 else min(1.0, o * 1.15))
        if niv_olhos and pisca[i] > 0:
            x0, y0, x1, y1 = cx_olhos
            q[y0:y1, x0:x1] = nivel(niv_olhos, float(pisca[i]))
        if a.movimento:
            giro = 0.55 * ruido(t, [0.19, 0.43], fases[0:2], [0.65, 0.35])
            dx = 6.0 * ruido(t, [0.13, 0.37], fases[2:4], [0.6, 0.4])
            dy = 4.0 * ruido(t, [0.17, 0.41], fases[4:6], [0.6, 0.4]) + 5.0 * float(energia[i])
            escala = 1.035 + 0.005 * math.sin(2 * math.pi * t / 4.4 + fases[6])
            M = cv2.getRotationMatrix2D(pivo, giro, escala)
            M[0, 2] += dx
            M[1, 2] += dy
            q = cv2.warpAffine(q, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        proc.stdin.write(np.clip(q, 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg falhou ao gravar o clipe")
    print(json.dumps({"saida": a.saida, "quadros": n, "piscadas": int((np.diff((pisca > 0).astype(int)) == 1).sum() + (pisca[0] > 0)), "abertura_media": round(float(abre.mean()), 3)}))


def main():
    p = argparse.ArgumentParser()
    s = p.add_subparsers(dest="cmd", required=True)
    pp = s.add_parser("preparar")
    pp.add_argument("--base", required=True)
    pp.add_argument("--boca1", required=True)
    pp.add_argument("--boca2")
    pp.add_argument("--olhos")
    pp.add_argument("--pasta", required=True)
    pa = s.add_parser("animar")
    pa.add_argument("--pasta", required=True)
    pa.add_argument("--audio", required=True)
    pa.add_argument("--dur", type=float, required=True)
    pa.add_argument("--saida", required=True)
    pa.add_argument("--fps", type=int, default=25)
    pa.add_argument("--semente", type=int, default=1)
    pa.add_argument("--sem-movimento", dest="movimento", action="store_false")
    a = p.parse_args()
    (preparar if a.cmd == "preparar" else animar)(a)


if __name__ == "__main__":
    main()
