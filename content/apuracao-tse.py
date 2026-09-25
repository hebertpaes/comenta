#!/usr/bin/env python3
"""Apuração das eleições pelos arquivos públicos do TSE (resultados.tse.jus.br) — por
estado, município, BAIRRO, LOCAL DE VOTAÇÃO e SEÇÃO. Só biblioteca padrão do Python 3.

  python3 apuracao-tse.py config                                  # eleições/pleitos no ele-c.json (e se o ciclo 2026 já saiu)
  python3 apuracao-tse.py municipio --ano 2022 --ele 546 --uf mt --mun 90670 --cargo 0003
  python3 apuracao-tse.py secoes --ano 2022 --pleito 406 --uf mt --mun 90670 [--limite 30] \\
          [--validar-ele 546 --cargos 0003,0005] [--mapa pautas/eleicoes/locais-votacao-mt.csv]
  python3 apuracao-tse.py locais --entrada eleitorado_local_votacao_2026.zip --uf mt --mun 90670,91677
  python3 apuracao-tse.py pagina --ano 2022 --federal 544 --estadual 546 --pleito 406 --saida DIR

Opções gerais (antes do subcomando): --ambiente oficial|simulado (padrão oficial; o simulado
do TSE só responde nas janelas de teste), --cache DIR, --conexoes N (máx. 8), --revalidar SEG
(padrão: 0 = sempre pergunta ao TSE com ETag para o ano corrente; nunca para anos passados),
--offline (usa só o cache).

De onde vem cada dado (URLs relativas a https://resultados.tse.jus.br/<ambiente>/):
  comum/config/ele-c.json                                   ciclo corrente, pleitos, eleições, cargos
  ele<ano>/<ele>/config/mun-e<ele6>-cm.json                 municípios por UF (código TSE, nome, capital, zonas)
  ele<ano>/<ele>/dados/<uf>/<uf><mun>-c<cargo>-e<ele6>-v.json      totais variáveis (votos por número)
  ele<ano>/<ele>/dados/<uf>/<nadf>.json  (nadf vem no -v)          arquivo fixo -f: nomes, partidos, vices
  ele<ano>/<ele>/dados-simplificados/<uf>/<uf>-c<cargo>-e<ele6>-r.json   resultado consolidado da UF (ou br)
  ele<ano>/arquivo-urna/<pleito>/config/<uf>/<uf>-p<pl6>-cs.json  zonas e seções (ns; nsa = agregadas; nsp = principal)
  ele<ano>/arquivo-urna/<pleito>/dados/<uf>/<mun>/<zona>/<secao>/p<pl6>-<uf>-m<mun>-z<zona>-s<secao>-aux.json
        situação da seção ("st") e hashes[].arq[] (bu, imgbu, rdv, log...); o BU fica em .../<secao>/<hash>/<nome do arq>
O BU (.bu em 2022, -bu.dat em 2024) é ASN.1/DER (spec pública do TSE "bu.asn1", ModuloBU, IMPLICIT TAGS):
EntidadeEnvelopeGenerico.conteudo -> EntidadeBoletimUrna -> resultadosVotacaoPorEleicao. O decodificador
abaixo lê essas estruturas por tag, sem dependências.
"""
import argparse
import base64
import collections
import concurrent.futures as cf
import csv
import datetime as dt
import html
import http.client
import io
import json
import os
import random
import re
import ssl
import sys
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from decimal import Decimal, ROUND_HALF_UP

HOST = 'resultados.tse.jus.br'
UA = 'hojemt-apuracao/1.0 (+https://hojemt.com.br/apuracao-2026/)'
AQUI = os.path.dirname(os.path.abspath(__file__))
CACHE_PADRAO = os.environ.get('TSE_CACHE') or \
    '/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad/tse-cache'
SAIDA_PADRAO = os.path.join(os.path.dirname(CACHE_PADRAO), 'tse-saida')
MAPA_PADRAO = os.path.join(AQUI, 'pautas', 'eleicoes', 'locais-votacao-mt.csv')
MAX_CONEXOES = 8

CARGOS = {'0001': 'Presidente', '0003': 'Governador', '0005': 'Senador', '0006': 'Deputado Federal',
          '0007': 'Deputado Estadual', '0008': 'Deputado Distrital', '0011': 'Prefeito', '0013': 'Vereador'}
MAJORITARIOS = {'0001', '0003', '0005', '0011'}
UFS = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi',
       'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to']


# ----------------------------------------------------------------------------- utilidades
def pct(a, b):
    if not b:
        return '0,00'
    q = (Decimal(a) * 100 / Decimal(b)).quantize(Decimal('0.01'), ROUND_HALF_UP)
    return str(q).replace('.', ',')


def milhar(n):
    return f'{int(n):,}'.replace(',', '.')


def agora():
    return dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def sem_acento(s):
    return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', sem_acento(s).lower()).strip('-')


def z4(x):
    return f'{int(x):04d}'


def grava_json(caminho, obj, compacto=False):
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    tmp = caminho + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        if compacto:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, caminho)


class ErroTSE(Exception):
    pass


# ----------------------------------------------------------------------------- cliente HTTP
class Cliente:
    """GET em resultados.tse.jus.br com no máximo 8 conexões persistentes (keep-alive, pelo
    túnel do proxy HTTPS_PROXY se houver), retentativa com backoff exponencial e cache em disco.
    modo='fixo': arquivo imutável (BU dentro do diretório do hash) — se está no cache, não vai à rede.
    modo='vivo': revalida com If-None-Match/If-Modified-Since (304 = usa o cache) conforme --revalidar."""

    def __init__(self, cache=CACHE_PADRAO, conexoes=MAX_CONEXOES, tentativas=6, timeout=40,
                 revalidar=0.0, offline=False):
        self.cache = cache
        self.conexoes = max(1, min(MAX_CONEXOES, int(conexoes)))
        self.tentativas, self.timeout = tentativas, timeout
        self.revalidar, self.offline = revalidar, offline
        self._tl = threading.local()
        self._lock = threading.Lock()
        self._sem = threading.BoundedSemaphore(self.conexoes)
        self.st = collections.Counter()
        self.por_tipo = collections.defaultdict(collections.Counter)
        self.ctx = ssl.create_default_context()  # verificação TLS sempre ligada (usa SSL_CERT_FILE se houver)
        proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
        self.proxy = None
        if proxy and not urllib.request.proxy_bypass_environment(HOST):
            self.proxy = urllib.parse.urlsplit(proxy if '://' in proxy else 'http://' + proxy)
        self.pool = cf.ThreadPoolExecutor(max_workers=self.conexoes, thread_name_prefix='tse')
        self.t0 = time.monotonic()

    # -- conexões
    def _conn(self):
        c = getattr(self._tl, 'c', None)
        if c is None:
            if self.proxy:
                c = http.client.HTTPSConnection(self.proxy.hostname, self.proxy.port or 80,
                                                context=self.ctx, timeout=self.timeout)
                cab = {}
                if self.proxy.username:
                    cred = f'{urllib.parse.unquote(self.proxy.username)}:{urllib.parse.unquote(self.proxy.password or "")}'
                    cab['Proxy-Authorization'] = 'Basic ' + base64.b64encode(cred.encode()).decode()
                c.set_tunnel(HOST, 443, headers=cab)
            else:
                c = http.client.HTTPSConnection(HOST, 443, context=self.ctx, timeout=self.timeout)
            self._tl.c = c
        return c

    def _fecha(self):
        c = getattr(self._tl, 'c', None)
        if c is not None:
            try:
                c.close()
            except Exception:
                pass
        self._tl.c = None

    @staticmethod
    def tipo(caminho):
        n = caminho.rsplit('/', 1)[-1]
        for suf, t in (('-aux.json', 'aux'), ('-cs.json', 'cs'), ('-cm.json', 'cm'), ('-v.json', 'v'),
                       ('-f.json', 'f'), ('-r.json', 'r'), ('ele-c.json', 'ele-c'), ('-ab.json', 'ab')):
            if n.endswith(suf):
                return t
        if n.endswith('.bu') or n.endswith('-bu.dat'):
            return 'bu'
        return 'outro'

    def _requisita(self, caminho, cab):
        erro = None
        for i in range(self.tentativas):
            with self._sem:
                c = self._conn()
                t0 = time.monotonic()
                try:
                    c.request('GET', caminho, headers=cab)
                    r = c.getresponse()
                    corpo = r.read()
                except (OSError, http.client.HTTPException) as e:
                    self._fecha()
                    erro = f'{type(e).__name__}: {e}'
                    status = None
                else:
                    status = r.status
                    dur = time.monotonic() - t0
                    with self._lock:
                        self.st['requisicoes'] += 1
                        self.st['bytes'] += len(corpo)
                        self.st[f'http_{status}'] += 1
                        self.st['tempo_rede_ms'] += int(dur * 1000)
                        pt = self.por_tipo[self.tipo(caminho)]
                        pt['req'] += 1
                        pt['bytes'] += len(corpo)
                        pt['ms'] += int(dur * 1000)
                    if (r.getheader('Connection') or '').lower() == 'close':
                        self._fecha()
                    if status == 429 or status >= 500:
                        erro = f'HTTP {status}'
                    else:
                        return status, corpo, r
            with self._lock:
                self.st['retentativas'] += 1
            time.sleep(min(15.0, 0.5 * 2 ** i) + random.random() * 0.4)
        raise ErroTSE(f'falhou após {self.tentativas} tentativas: {caminho} ({erro})')

    def _get(self, caminho, modo):
        arq = os.path.join(self.cache, HOST, caminho.lstrip('/'))
        meta_arq = arq + '.meta'
        existe = os.path.exists(arq)
        if existe:
            fresco = modo == 'fixo' or self.offline
            if not fresco and self.revalidar is not None:
                try:
                    fresco = time.time() - os.path.getmtime(meta_arq if os.path.exists(meta_arq) else arq) < self.revalidar
                except OSError:
                    fresco = False
            if fresco:
                with self._lock:
                    self.st['cache'] += 1
                with open(arq, 'rb') as f:
                    return f.read()
        if self.offline:
            return None
        cab = {'User-Agent': UA, 'Accept': '*/*'}
        if existe and modo == 'vivo' and os.path.exists(meta_arq):
            try:
                with open(meta_arq, encoding='utf-8') as f:
                    meta = json.load(f)
                if meta.get('etag'):
                    cab['If-None-Match'] = meta['etag']
                if meta.get('lm'):
                    cab['If-Modified-Since'] = meta['lm']
            except (OSError, ValueError):
                pass
        status, corpo, r = self._requisita(caminho, cab)
        if status == 304 and existe:
            os.utime(meta_arq if os.path.exists(meta_arq) else arq)
            with open(arq, 'rb') as f:
                return f.read()
        if status == 404:
            return None
        if status == 403:
            raise ErroTSE(f'403 (bloqueado) em {caminho}')
        if status != 200:
            raise ErroTSE(f'HTTP {status} em {caminho}')
        os.makedirs(os.path.dirname(arq), exist_ok=True)
        tmp = f'{arq}.{threading.get_ident()}.tmp'
        with open(tmp, 'wb') as f:
            f.write(corpo)
        os.replace(tmp, arq)
        if modo == 'vivo':
            with open(meta_arq + '.tmp', 'w', encoding='utf-8') as f:
                json.dump({'etag': r.getheader('ETag'), 'lm': r.getheader('Last-Modified'), 't': time.time()}, f)
            os.replace(meta_arq + '.tmp', meta_arq)
        return corpo

    def get(self, caminho, modo='vivo'):
        if threading.current_thread().name.startswith('tse'):
            return self._get(caminho, modo)
        return self.pool.submit(self._get, caminho, modo).result()

    def json(self, caminho, modo='vivo'):
        b = self.get(caminho, modo)
        return None if b is None else json.loads(b.decode('utf-8'))

    def mapa(self, fn, itens):
        """Executa fn(item) em até 8 threads; devolve (item, resultado|exceção) na ordem de conclusão."""
        futs = {self.pool.submit(fn, it): it for it in itens}
        for f in cf.as_completed(futs):
            try:
                yield futs[f], f.result()
            except Exception as e:  # noqa: BLE001 — erro de uma seção não derruba a varredura
                yield futs[f], e

    def resumo(self):
        dur = time.monotonic() - self.t0
        s = self.st
        return (f"{s['requisicoes']} requisições ({s['http_200']} × 200, {s['http_304']} × 304, "
                f"{s['http_404']} × 404, {s['retentativas']} retentativas), {s['bytes'] / 1e6:.2f} MB baixados, "
                f"{s['cache']} do cache, {dur:.1f} s")


# ----------------------------------------------------------------------------- caminhos do TSE
class Tse:
    def __init__(self, ambiente='oficial', ano=None):
        self.amb = ambiente
        self.ciclo = f'ele{ano}' if ano else None

    def ele_c(self):
        return f'/{self.amb}/comum/config/ele-c.json'

    def cm(self, ele):
        return f'/{self.amb}/{self.ciclo}/{int(ele)}/config/mun-e{int(ele):06d}-cm.json'

    def v(self, ele, uf, cargo, mun=''):
        return f'/{self.amb}/{self.ciclo}/{int(ele)}/dados/{uf}/{uf}{mun}-c{cargo}-e{int(ele):06d}-v.json'

    def fixo(self, ele, nadf):
        return f'/{self.amb}/{self.ciclo}/{int(ele)}/dados/{nadf.split("-")[0].lower()}/{nadf}.json'

    def r(self, ele, uf, cargo):
        return f'/{self.amb}/{self.ciclo}/{int(ele)}/dados-simplificados/{uf}/{uf}-c{cargo}-e{int(ele):06d}-r.json'

    def cs(self, pleito, uf):
        return f'/{self.amb}/{self.ciclo}/arquivo-urna/{int(pleito)}/config/{uf}/{uf}-p{int(pleito):06d}-cs.json'

    def dir_secao(self, pleito, uf, mun, zona, secao):
        return f'/{self.amb}/{self.ciclo}/arquivo-urna/{int(pleito)}/dados/{uf}/{mun}/{zona}/{secao}'

    def aux(self, pleito, uf, mun, zona, secao):
        return (f'{self.dir_secao(pleito, uf, mun, zona, secao)}/'
                f'p{int(pleito):06d}-{uf}-m{mun}-z{zona}-s{secao}-aux.json')


# ----------------------------------------------------------------------------- BU (ASN.1 DER)
FASES = {1: 'simulado', 2: 'oficial', 3: 'treinamento'}
TIPO_URNA = {1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao'}
TIPO_ARQUIVO = {1: 'votacaoUE', 2: 'votacaoRED', 3: 'saMistaMRParcialCedula', 4: 'saMistaBUImpressoCedula',
                5: 'saManual', 6: 'saEletronica'}
TIPO_CARGO = {1: 'majoritario', 2: 'proporcional', 3: 'consulta'}


def _tlv(b, i):
    t = b[i]
    i += 1
    if t & 0x1F == 0x1F:  # número de tag longo (não usado no BU): pula
        while b[i] & 0x80:
            i += 1
        i += 1
    n = b[i]
    i += 1
    if n & 0x80:
        k = n & 0x7F
        n = int.from_bytes(b[i:i + k], 'big')
        i += k
    if i + n > len(b):
        raise ValueError('DER truncado')
    return t, i, i + n


def _filhos(b):
    out, i = [], 0
    while i < len(b):
        t, a, z = _tlv(b, i)
        out.append((t, b[a:z]))
        i = z
    return out


def _int(v):
    return int.from_bytes(v, 'big', signed=True)


def decodifica_bu(raw):
    """EntidadeEnvelopeGenerico (DER) -> dict com a seção e os votos por eleição/cargo/votável."""
    topo = _filhos(raw)
    if not topo or topo[0][0] != 0x30:
        raise ValueError('não é um envelope ASN.1')
    env = _filhos(topo[0][1])
    tags = [t for t, _ in env]
    if 0x04 not in tags:
        raise ValueError('envelope sem conteúdo')
    enums = [_int(v) for t, v in env if t == 0x0A]  # fase, tipoEnvelope
    if len(enums) >= 2 and enums[1] != 1:
        raise ValueError(f'envelope não é de BU (tipoEnvelope={enums[1]})')
    i_tipo = [k for k, t in enumerate(tags) if t == 0x0A][-1]
    if any(t == 0x30 for t in tags[i_tipo + 1:]):
        raise ValueError('conteúdo cifrado (campo seguranca presente)')
    conteudo = [v for t, v in env if t == 0x04][-1]
    t, corpo = _filhos(conteudo)[0]
    if t != 0x30:
        raise ValueError('EntidadeBoletimUrna inválida')
    f = _filhos(corpo)
    seqs = [v for t, v in f if t == 0x30]  # cabecalho, urna, identificacaoSecao
    out = {}
    cab = _filhos(seqs[0])
    out['gerado'] = cab[0][1].decode('latin-1')
    out['id_eleitoral'] = {0x81: 'processo', 0x82: 'pleito', 0x83: 'eleicao'}.get(cab[1][0], hex(cab[1][0]))
    out['id_eleitoral_cd'] = _int(cab[1][1])
    out['fase'] = FASES.get(_int(next(v for t, v in f if t == 0x0A)), '?')
    urna = _filhos(seqs[1])
    ue = [_int(v) for t, v in urna if t == 0x0A]
    out['tipo_urna'] = TIPO_URNA.get(ue[0], ue[0]) if ue else None
    out['tipo_arquivo'] = TIPO_ARQUIVO.get(ue[1], ue[1]) if len(ue) > 1 else None
    out['versao'] = next((v.decode('latin-1') for t, v in urna if t == 0x1B), None)
    ident = _filhos(seqs[2])
    mz = _filhos(ident[0][1])
    out['municipio'], out['zona'] = _int(mz[0][1]), _int(mz[1][1])
    out['local'], out['secao'] = _int(ident[1][1]), _int(ident[2][1])
    out['emissao'] = next((v.decode('latin-1') for t, v in f if t == 0x1B), None)
    for t, v in f:
        if t == 0xA0:
            ds = [x.decode('latin-1') for tt, x in _filhos(v) if tt == 0x1B]
            out['abertura'], out['encerramento'] = (ds + [None, None])[:2]
        elif t == 0xA1:
            out['apuracao_sa'] = [_int(x) for tt, x in _filhos(v) if tt == 0x02]
        elif t == 0x81:
            out['lib_codigo'] = _int(v)
        elif t == 0x82:
            out['biometria'] = _int(v)
    eleicoes = {}
    for t, v in f:
        if t != 0xA3:
            continue
        for _, rpe in _filhos(v):
            ch = _filhos(rpe)
            ele, aptos = _int(ch[0][1]), _int(ch[1][1])
            cargos = {}
            for _, rv in _filhos(ch[2][1]):
                rc = _filhos(rv)
                tipo = TIPO_CARGO.get(_int(rc[0][1]), '?')
                comp = _int(rc[1][1])
                for _, tvc in _filhos(rc[2][1]):
                    tc = _filhos(tvc)
                    cod = _int(tc[0][1])  # 0x81 cargo constitucional / 0x82 cargo ou consulta livre
                    cargo = f'{cod:04d}'
                    c = {'tipo': tipo, 'comparecimento': comp, 'nominais': {}, 'legenda': {}, 'brancos': 0,
                         'nulos': 0, 'sem_candidato': 0}
                    for _, vv in _filhos(tc[2][1]):
                        tipo_voto, qtd, num = None, 0, None
                        for tt, x in _filhos(vv):
                            if tt == 0x81:
                                tipo_voto = _int(x)
                            elif tt == 0x82:
                                qtd = _int(x)
                            elif tt == 0xA3:
                                iv = _filhos(x)
                                num = str(_int(iv[1][1]))
                        if tipo_voto == 1:
                            c['nominais'][num] = c['nominais'].get(num, 0) + qtd
                        elif tipo_voto == 4:
                            c['legenda'][num] = c['legenda'].get(num, 0) + qtd
                        elif tipo_voto == 2:
                            c['brancos'] += qtd
                        elif tipo_voto == 3:
                            c['nulos'] += qtd
                        elif tipo_voto == 5:
                            c['sem_candidato'] += qtd
                    cargos[cargo] = c
            eleicoes[str(ele)] = {'aptos': aptos, 'cargos': cargos}
    out['eleicoes'] = eleicoes
    return out


# ----------------------------------------------------------------------------- bairros e mapa de locais
CORRECOES_BAIRRO = {  # chave sem acento -> grafia correta (só casos inequívocos)
    'DISTRITO DE PASSAGEM DA CONCEICAO': 'DISTRITO DE PASSAGEM DA CONCEIÇÃO',
    'JARDIM VITORIA REGIA': 'JARDIM VITÓRIA RÉGIA',
    'MARINGA III': 'MARINGÁ III',
}
_ABREV = [(r'^JD\.?\s', 'JARDIM '), (r'^RES\.?\s', 'RESIDENCIAL '), (r'^CONJ\.?\s|^CJ\.?\s', 'CONJUNTO '),
          (r'^PQ\.?\s', 'PARQUE '), (r'^VL\.?\s', 'VILA '), (r'^LOT\.?\s', 'LOTEAMENTO '),
          (r'^BAIRRO\s', ''), (r'^N\.?\s?SRA\.?\s', 'NOSSA SENHORA '), (r'^STA\.?\s', 'SANTA '), (r'^STO\.?\s', 'SANTO ')]


def nome_bairro(s):
    s = re.sub(r'\s+', ' ', (s or '').strip().upper())
    for a, b in _ABREV:
        s = re.sub(a, b, s)
    if not s or s in ('#NULO#', '-1', 'NULO'):
        return 'NÃO INFORMADO'
    return CORRECOES_BAIRRO.get(chave_bairro(s), s)


def chave_bairro(s):
    return re.sub(r'[^A-Z0-9]+', ' ', sem_acento(s).upper()).strip()


def le_mapa(caminho):
    """CSV zona;local;nome;endereco;bairro;cep;lat;lon;fonte;ano[;cd_municipio;...;secoes;secoes_agregadas].
    Devolve (locais[(zona, local)] -> linha, secoes[(zona, secao)] -> local)."""
    locais, secoes = {}, {}
    if not caminho or not os.path.exists(caminho):
        return locais, secoes
    with open(caminho, encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f, delimiter=';'):
            try:
                z, l = int(row['zona']), int(row['local'])
            except (KeyError, ValueError):
                continue
            locais[(z, l)] = row
            for col in ('secoes', 'secoes_agregadas'):
                for s in (row.get(col) or '').replace(',', ' ').split():
                    secoes.setdefault((z, int(s)), l)
    return locais, secoes


def _linhas_dataset(entrada):
    """Lê o dataset eleitorado_local_votacao_<ano> do TSE (zip/csv latin-1 ';') ou o espelho em JSON."""
    if re.match(r'https?://', entrada):
        req = urllib.request.Request(entrada, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            dados = r.read()
        nome = urllib.parse.urlsplit(entrada).path
    else:
        with open(entrada, 'rb') as f:
            dados = f.read()
        nome = entrada
    if nome.lower().endswith('.zip'):
        z = zipfile.ZipFile(io.BytesIO(dados))
        membros = [m for m in z.namelist() if m.lower().endswith(('.csv', '.txt'))]
        if not membros:
            raise SystemExit('zip sem CSV')
        dados = z.read(membros[0])
        nome = membros[0]
    if nome.lower().endswith('.json'):
        yield from json.loads(dados.decode('utf-8'))
        return
    try:
        texto = dados.decode('utf-8')
    except UnicodeDecodeError:
        texto = dados.decode('latin-1')
    yield from csv.DictReader(io.StringIO(texto, newline=''), delimiter=';')


def cmd_locais(a):
    muns = set(a.mun.split(','))
    uf = a.uf.upper()
    grupos, geracao, anos = {}, set(), set()
    n = 0
    for row in _linhas_dataset(a.entrada):
        if row.get('SG_UF') != uf or row.get('CD_MUNICIPIO') not in muns:
            continue
        if a.turno and row.get('NR_TURNO') and row['NR_TURNO'] != str(a.turno):
            continue
        n += 1
        k = (int(row['NR_ZONA']), int(row['NR_LOCAL_VOTACAO']))
        g = grupos.setdefault(k, {'row': row, 'principais': set(), 'agregadas': set(), 'eleitores': 0})
        (g['agregadas'] if row.get('DS_TIPO_SECAO_AGREGADA', '').lower().startswith('agreg') else g['principais']).add(
            int(row['NR_SECAO']))
        try:
            g['eleitores'] += int(row.get('QT_ELEITOR_SECAO') or 0)
        except ValueError:
            pass
        geracao.add(f"{row.get('DT_GERACAO')} {row.get('HH_GERACAO')}")
        anos.add(row.get('AA_ELEICAO'))
    if not grupos:
        raise SystemExit('nenhuma linha para esse UF/município — confira --uf/--mun e o arquivo')
    ano = a.ano or '/'.join(sorted(x for x in anos if x))
    fonte = a.fonte or f"TSE eleitorado_local_votacao_{ano} (gerado {', '.join(sorted(geracao))})"
    # grafia de exibição: por município, a variante mais frequente (com acento) de cada chave
    variantes = collections.defaultdict(collections.Counter)
    for (z, l), g in grupos.items():
        r = g['row']
        variantes[(r['CD_MUNICIPIO'], chave_bairro(nome_bairro(r['NM_BAIRRO'])))][nome_bairro(r['NM_BAIRRO'])] += 1
    exib = {k: max(c.items(), key=lambda kv: (kv[1], len(kv[0].encode())))[0] for k, c in variantes.items()}
    cols = ['zona', 'local', 'nome', 'endereco', 'bairro', 'cep', 'lat', 'lon', 'fonte', 'ano', 'cd_municipio',
            'municipio', 'bairro_tse', 'tipo_local', 'secoes', 'secoes_agregadas', 'eleitores']
    os.makedirs(os.path.dirname(os.path.abspath(a.saida)), exist_ok=True)
    with open(a.saida, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, delimiter=';', lineterminator='\n')
        w.writerow(cols)
        for (z, l) in sorted(grupos, key=lambda k: (grupos[k]['row']['CD_MUNICIPIO'], k)):
            g = grupos[(z, l)]
            r = g['row']
            lat, lon = r.get('NR_LATITUDE', ''), r.get('NR_LONGITUDE', '')
            if lat in ('-1', '0', '') or lon in ('-1', '0', ''):
                lat = lon = ''
            b = exib[(r['CD_MUNICIPIO'], chave_bairro(nome_bairro(r['NM_BAIRRO'])))]
            w.writerow([z4(z), z4(l), r['NM_LOCAL_VOTACAO'].strip(), r['DS_ENDERECO'].strip(), b,
                        r.get('NR_CEP', ''), lat, lon, fonte, ano, r['CD_MUNICIPIO'], r['NM_MUNICIPIO'],
                        r['NM_BAIRRO'].strip(), r.get('DS_TIPO_LOCAL', ''),
                        ' '.join(z4(s) for s in sorted(g['principais'])),
                        ' '.join(z4(s) for s in sorted(g['agregadas'])), g['eleitores']])
    por_mun = collections.Counter(g['row']['NM_MUNICIPIO'] for g in grupos.values())
    bairros = collections.defaultdict(set)
    for g in grupos.values():
        bairros[g['row']['NM_MUNICIPIO']].add(chave_bairro(nome_bairro(g['row']['NM_BAIRRO'])))
    print(f'{n} seções lidas -> {len(grupos)} locais em {a.saida}')
    for m, q in por_mun.items():
        print(f'  {m}: {q} locais, {len(bairros[m])} bairros')
    print(f'  fonte: {fonte}')


# ----------------------------------------------------------------------------- config
def cmd_config(a, cli):
    tse = Tse(a.ambiente)
    d = cli.json(tse.ele_c())
    if d is None:
        raise SystemExit('ele-c.json não encontrado (ambiente simulado fora da janela de testes?)')
    print(f"ele-c.json ({a.ambiente}) gerado em {d.get('dg')} {d.get('hg')} — ciclo corrente: {d.get('c')}")
    alvo = []
    for p in d.get('pl', []):
        eles = p.get('e', [])
        ordinaria = any(re.search(r'ordin|gera', html.unescape(e.get('nm', '')), re.I) for e in eles)
        if not a.todos and not ordinaria and not p.get('dt', '').endswith(str(dt.date.today().year)):
            continue
        print(f"\npleito {p['cd']} (processo {p.get('cdpr')}) — {p.get('dt')}  [arquivo-urna/{p['cd']}]")
        for e in eles:
            nm = html.unescape(e.get('nm', ''))
            abr = e.get('abr', [])
            cps = {}
            for ab in abr:
                for c in ab.get('cp', []):
                    cps[c['cd']] = c['ds']
            ufs = [ab['cd'] for ab in abr]
            print(f"  eleição {e['cd']:>5}  turno {e.get('t')}  tp {e.get('tp')}  2ºT={e.get('cdt2') or '-':>4}  {nm}")
            print(f"           cargos: {', '.join(f'{int(k):04d} {v[:28]}' for k, v in cps.items())}"
                  f"  | abrangências: {len(ufs)} ({', '.join(ufs[:8])}{'…' if len(ufs) > 8 else ''})")
            if p.get('dt') == '04/10/2026' or '2026' in nm and ordinaria:
                alvo.append((p['cd'], e['cd'], nm))
    pub = d.get('c') == 'ele2026'
    print(f"\nCiclo ele2026 publicado: {'SIM' if pub else 'NÃO'} (ciclo corrente = {d.get('c')})")
    if alvo:
        print('Eleições de 04/10/2026 encontradas:')
        for pl, ele, nm in alvo:
            print(f'  pleito {pl}, eleição {ele}: {nm}')
        print('Use: municipio --ano 2026 --ele <estadual> ... | secoes --ano 2026 --pleito <pleito> ...')
    else:
        print('Nenhuma eleição de 04/10/2026 no ele-c.json ainda. Em 2022 (mesmo formato): federal 544, '
              'estadual 546, pleito 406 (2º turno: 545/547, pleito 407).')


# ----------------------------------------------------------------------------- resultado por abrangência
def indice_fixo(f):
    """Arquivo fixo -f -> {numero: {nm, nome, sg, partido, coligacao, composicao, vice, dvt}}."""
    out = {}
    carg = (f or {}).get('carg', {})
    for agr in carg.get('agr', []):
        for par in agr.get('par', []):
            for c in par.get('cand', []):
                vs = c.get('vs') or []
                out[c['n']] = {'nm': c.get('nmu') or c.get('nm'), 'nome': c.get('nm'), 'sg': par.get('sg'),
                               'coligacao': agr.get('nm'), 'composicao': agr.get('com'), 'tp_agr': agr.get('tp'),
                               'vice': vs[0].get('nmu') if vs else None, 'dvt': c.get('dvt')}
    return out


def cc_de(info):
    if not info:
        return ''
    sg, com = info.get('sg') or '', info.get('composicao') or ''
    if info.get('tp_agr') in ('C', 'F') and com and com.replace(' ', '') != sg.replace(' ', ''):
        return f'{sg} - {com}'
    return sg


def resultado_r(r, municipio=None):
    """dados-simplificados -r.json -> formato da página (<uf>-c<cargo>.json)."""
    cands = sorted(r.get('cand', []), key=lambda c: (-int(c.get('vap') or 0), int(c.get('seq') or 999)))
    return {
        'atualizado': f"{r.get('dt', '')} {r.get('ht', '')}".strip(), 'turno': r.get('t'),
        'abr': r.get('cdabr'), 'secoes_totalizadas_pct': r.get('pst'), 'secoes': r.get('s'),
        'secoes_totalizadas': r.get('st'), 'eleitorado': r.get('e'), 'comparecimento': r.get('c'),
        'comparecimento_pct': r.get('pc'), 'abstencao': r.get('a'), 'abstencao_pct': r.get('pa'),
        'votos_validos': r.get('vv'), 'brancos': r.get('vb'), 'brancos_pct': r.get('pvb'),
        'nulos': r.get('tvn'), 'nulos_pct': r.get('ptvn'),
        'candidatos': [{'n': c.get('n'), 'nm': c.get('nm'), 'cc': c.get('cc'), 'nv': c.get('nv'),
                        'st': c.get('st'), 'e': (c.get('e') or 'n').lower(), 'vap': c.get('vap'),
                        'pvap': c.get('pvap')} for c in cands],
        'total_candidatos': len(cands), **({'municipio': municipio} if municipio else {}),
        'final': (r.get('tf') or '').lower() == 's',
    }


def resultado_v(v, fixo, cc_por_numero=None, municipio=None):
    """-v.json (1ª abrangência) + fixo -> formato da página (<uf><mun>-c<cargo>.json)."""
    ab = v['abr'][0]
    cc_por_numero = cc_por_numero or {}
    cands = []
    for c in sorted(ab.get('cand', []), key=lambda c: (-int(c.get('vap') or 0), int(c.get('seq') or 999))):
        info = fixo.get(c['n'], {})
        cands.append({'n': c['n'], 'nm': info.get('nm') or f"Nº {c['n']}",
                      'cc': cc_por_numero.get(c['n'], {}).get('cc') or cc_de(info),
                      'nv': cc_por_numero.get(c['n'], {}).get('nv') or info.get('vice'),
                      'st': c.get('st'), 'e': (c.get('e') or 'n').lower(), 'vap': c.get('vap'), 'pvap': c.get('pvap')})
    return {
        'atualizado': f"{ab.get('dt', '')} {ab.get('ht', '')}".strip(), 'turno': v.get('t'), 'abr': ab.get('cdabr'),
        'secoes_totalizadas_pct': ab.get('pst'), 'secoes': ab.get('s'), 'secoes_totalizadas': ab.get('st'),
        'eleitorado': ab.get('e'), 'comparecimento': ab.get('c'), 'comparecimento_pct': ab.get('pc'),
        'abstencao': ab.get('a'), 'abstencao_pct': ab.get('pa'), 'votos_validos': ab.get('vv'),
        'brancos': ab.get('vb'), 'brancos_pct': ab.get('pvb'), 'nulos': ab.get('tvn'), 'nulos_pct': ab.get('ptvn'),
        'candidatos': cands, 'total_candidatos': len(cands), **({'municipio': municipio} if municipio else {}),
        'final': (ab.get('tf') or '').upper() == 'S',
    }


def busca_municipio(cli, tse, ele, uf, mun, cargo, cache_fixo=None, cache_r=None):
    v = cli.json(tse.v(ele, uf, cargo, mun))
    if v is None:
        return None, None, None
    nadf = v.get('nadf')
    cache_fixo = {} if cache_fixo is None else cache_fixo
    if nadf and nadf not in cache_fixo:
        cache_fixo[nadf] = indice_fixo(cli.json(tse.fixo(ele, nadf), modo='fixo'))
    fixo = cache_fixo.get(nadf, {})
    return v, fixo, cache_r


def nomes_municipios(cli, tse, ele, uf):
    cm = cli.json(tse.cm(ele)) or {}
    for ab in cm.get('abr', []):
        if ab.get('cd', '').lower() == uf:
            return {m['cd']: m for m in ab.get('mu', [])}
    return {}


def cmd_municipio(a, cli):
    tse = Tse(a.ambiente, a.ano)
    cargo = z4(a.cargo)
    v, fixo, _ = busca_municipio(cli, tse, a.ele, a.uf, a.mun, cargo)
    if v is None:
        raise SystemExit(f'sem arquivo -v para {a.uf}{a.mun} cargo {cargo} eleição {a.ele}')
    uf_r = cli.json(tse.r(a.ele, 'br' if cargo == '0001' else a.uf, cargo)) or {}
    ccn = {c['n']: c for c in uf_r.get('cand', [])}
    muns = nomes_municipios(cli, tse, a.ele, a.uf)
    nm = muns.get(a.mun, {}).get('nm', a.mun)
    d = resultado_v(v, fixo, ccn, nm)
    if a.json:
        print(json.dumps(d, ensure_ascii=False, indent=1))
        return
    ab = v['abr'][0]
    print(f"{nm} ({a.mun}) — {CARGOS.get(cargo, cargo)} — eleição {a.ele} ({tse.ciclo}) — "
          f"totalização {d['atualizado']} ({'final' if d['final'] else 'parcial'}; arquivo gerado {v.get('dg')} {v.get('hg')})")
    print(f"Seções: {milhar(d['secoes_totalizadas'])} de {milhar(d['secoes'])} totalizadas ({d['secoes_totalizadas_pct']}%)")
    print(f"Eleitorado {milhar(d['eleitorado'])} | Comparecimento {milhar(d['comparecimento'])} ({d['comparecimento_pct']}%)"
          f" | Abstenção {milhar(d['abstencao'])} ({d['abstencao_pct']}%)")
    print(f"Brancos {milhar(d['brancos'])} ({d['brancos_pct']}%) | Nulos {milhar(d['nulos'])} ({d['nulos_pct']}%)"
          f" | Válidos {milhar(d['votos_validos'])} | Anulados {ab.get('van')} (sub judice {ab.get('vansj')})")
    print(f"{'Nº':>6}  {'Candidato':<28} {'Partido':<14} {'Votos':>10} {'%':>7}  Situação")
    for c in d['candidatos']:
        print(f"{c['n']:>6}  {c['nm'][:28]:<28} {(fixo.get(c['n'], {}).get('sg') or '')[:14]:<14} "
              f"{milhar(c['vap']):>10} {c['pvap']:>7}  {c['st']}")
    zonas = [x for x in v['abr'][1:] if x.get('tpabr') == 'ZONA']
    if zonas:
        print('Por zona: ' + '; '.join(f"z{z4(x['cdabr'])} {x['st']}/{x['s']} seções" for x in zonas))


# ----------------------------------------------------------------------------- varredura de seções
def lista_secoes(cs, mun):
    for ab in cs.get('abr', []):
        for m in ab.get('mu', []):
            if m['cd'] != mun:
                continue
            for z in m.get('zon', []):
                for s in z.get('sec', []):
                    if 'nsp' in s:  # seção agregada: os votos saem no BU da principal (nsp)
                        continue
                    yield z['cd'], s['ns'], s.get('nsa', [])


def _quando(h):
    try:
        return dt.datetime.strptime(f"{h.get('dr')} {h.get('hr')}", '%d/%m/%Y %H:%M:%S')
    except ValueError:
        return dt.datetime.min


def escolhe_hash(aux, incluir_recebidas=False):
    hs = [h for h in aux.get('hashes') or [] if any(x.get('tp') == 'bu' for x in h.get('arq', []))]
    tot = [h for h in hs if (h.get('st') or '').lower().startswith('totaliz')]
    cand = tot or (hs if incluir_recebidas else [])
    return max(cand, key=_quando) if cand else None


def processa_secao(cli, tse, pleito, uf, mun, zona, secao, agregadas, incluir_recebidas=False):
    t0 = time.monotonic()
    r = {'zona': zona, 'secao': secao, 'agregadas': agregadas}
    aux = cli.json(tse.aux(pleito, uf, mun, zona, secao))
    if aux is None:
        r.update(status='pendente', motivo='aux ainda não publicado (404)')
        return r
    r['st_tse'] = aux.get('st')
    h = escolhe_hash(aux, incluir_recebidas)
    if h is None:
        st = (aux.get('st') or '').lower()
        r.update(status='sem_votos' if re.search(r'n[aã]o instalad|anulad', st) else 'pendente',
                 motivo=f"aux sem BU totalizado (st={aux.get('st')})")
        return r
    nome = next(x['nm'] for x in h['arq'] if x.get('tp') == 'bu')
    raw = cli.get(f"{tse.dir_secao(pleito, uf, mun, zona, secao)}/{h['hash']}/{nome}", modo='fixo')
    if raw is None:
        r.update(status='pendente', motivo=f'BU listado no aux mas ausente (404): {nome}')
        return r
    bu = decodifica_bu(raw)
    if (bu['municipio'], bu['zona'], bu['secao']) != (int(mun), int(zona), int(secao)):
        r['divergencia'] = f"BU identifica m{bu['municipio']} z{bu['zona']} s{bu['secao']}"
    r.update(status='totalizada' if (h.get('st') or '').lower().startswith('totaliz') else 'recebida',
             hash=h['hash'], hash_st=h.get('st'), recebido=f"{h.get('dr')} {h.get('hr')}", arquivo=nome,
             local=bu['local'], bu=bu, ms=int((time.monotonic() - t0) * 1000))
    return r


def varre(cli, tse, pleito, uf, mun, limite=None, incluir_recebidas=False, progresso=True):
    cs = cli.json(tse.cs(pleito, uf))
    if cs is None:
        raise SystemExit(f'cs.json não encontrado: {tse.cs(pleito, uf)}')
    secs = list(lista_secoes(cs, mun))
    if not secs:
        raise SystemExit(f'município {mun} não está no cs.json de {uf}')
    if limite:
        secs = secs[:limite]
    regs, erros = [], []
    t0 = time.monotonic()
    for i, (it, res) in enumerate(cli.mapa(lambda s: processa_secao(cli, tse, pleito, uf, mun, *s, incluir_recebidas),
                                           secs), 1):
        if isinstance(res, Exception):
            erros.append({'zona': it[0], 'secao': it[1], 'erro': str(res)})
            regs.append({'zona': it[0], 'secao': it[1], 'agregadas': it[2], 'status': 'erro', 'motivo': str(res)})
        else:
            regs.append(res)
        if progresso and (i % 100 == 0 or i == len(secs)):
            print(f'  {i}/{len(secs)} seções  {time.monotonic() - t0:.1f} s  [{cli.resumo()}]', file=sys.stderr)
    regs.sort(key=lambda r: (r['zona'], r['secao']))
    return regs, erros, time.monotonic() - t0


# ----------------------------------------------------------------------------- agregação
def novo_grupo():
    return {'secoes': 0, 'secoes_totalizadas': 0, 'eleitorado': 0, 'comparecimento': 0, 'brancos': 0, 'nulos': 0,
            'legenda': 0, 'votos': collections.Counter(), 'lista_secoes': []}


def soma_secao(g, r, ele, cargo, com_secoes=False):
    g['secoes'] += 1
    item = {'s': r['secao'], 'z': r['zona'], 'st': r['status']}
    if r['status'] == 'totalizada':
        e = r['bu']['eleicoes'].get(str(ele))
        if e is not None:
            g['secoes_totalizadas'] += 1
            g['eleitorado'] += e['aptos']
            c = e['cargos'].get(cargo)
            item['ap'] = e['aptos']
            if c:
                g['comparecimento'] += c['comparecimento']
                g['brancos'] += c['brancos']
                g['nulos'] += c['nulos']
                g['legenda'] += sum(c['legenda'].values())
                g['votos'].update(c['nominais'])
                item.update(c=c['comparecimento'], b=c['brancos'], nl=c['nulos'], v=c['nominais'])
    if com_secoes:
        g['lista_secoes'].append(item)


def fecha_grupo(g, nomes, fixo=None, top=None):
    """Grupo somado -> mesmo formato do arquivo de município da página (+ campos do grupo)."""
    fixo = fixo or {}
    anulados = sum(q for n, q in g['votos'].items() if n in fixo and not (fixo[n].get('dvt') or 'Válido').startswith('Válido'))
    validos = sum(g['votos'].values()) - anulados + g['legenda']
    total = validos + anulados + g['brancos'] + g['nulos']
    cands = sorted(g['votos'].items(), key=lambda kv: (-kv[1], int(kv[0])))
    if top:
        cands = cands[:top]
    lista = []
    for n, q in cands:
        info = nomes.get(n, {})
        lista.append({'n': n, 'nm': info.get('nm') or f'Nº {n}', 'cc': info.get('cc', ''),
                      'st': info.get('st', ''), 'e': info.get('e', 'n'), 'vap': str(q), 'pvap': pct(q, validos)})
    return {
        'secoes_totalizadas_pct': pct(g['secoes_totalizadas'], g['secoes']), 'secoes': str(g['secoes']),
        'secoes_totalizadas': str(g['secoes_totalizadas']), 'eleitorado': str(g['eleitorado']),
        'comparecimento': str(g['comparecimento']), 'comparecimento_pct': pct(g['comparecimento'], g['eleitorado']),
        'abstencao': str(g['eleitorado'] - g['comparecimento']),
        'abstencao_pct': pct(g['eleitorado'] - g['comparecimento'], g['eleitorado']),
        'votos_validos': str(validos), 'brancos': str(g['brancos']), 'brancos_pct': pct(g['brancos'], total),
        'nulos': str(g['nulos']), 'nulos_pct': pct(g['nulos'], total), 'legenda': str(g['legenda']),
        'anulados': str(anulados), 'candidatos': lista, 'total_candidatos': len(g['votos']),
        'lider': lista[0]['n'] if lista and int(lista[0]['vap']) > 0 else None,
    }


def local_da_secao(r, mapa_secoes):
    if r.get('local') is not None:
        return int(r['zona']), int(r['local']), 'bu'
    l = mapa_secoes.get((int(r['zona']), int(r['secao'])))
    return (int(r['zona']), l, 'mapa') if l is not None else (int(r['zona']), None, None)


def agrega_detalhe(regs, ele, cargo, mapa_locais, mapa_secoes, nomes, fixo=None, top=None, mun_nome='', uf='', mun=''):
    """-> (arquivo -locais, arquivo -bairros, estatística de cobertura do mapa)."""
    locais, bairros = {}, {}
    cobertura = collections.Counter()
    for r in regs:
        z, l, origem = local_da_secao(r, mapa_secoes)
        info = mapa_locais.get((z, l)) if l is not None else None
        if l is None:
            chave_l, bairro = (z, 0), 'LOCAL DESCONHECIDO'
            cobertura['sem_local'] += 1
        else:
            chave_l = (z, l)
            bairro = (info or {}).get('bairro') or 'LOCAL FORA DO MAPA'
            cobertura['com_bairro' if info else 'local_fora_do_mapa'] += 1
        gl = locais.setdefault(chave_l, novo_grupo())
        gl['info'], gl['bairro'] = info, bairro
        soma_secao(gl, r, ele, cargo, com_secoes=True)
        gb = bairros.setdefault(chave_bairro(bairro), novo_grupo())
        gb['nome'] = bairro
        gb.setdefault('locais_set', set()).add(chave_l)
        soma_secao(gb, r, ele, cargo)
    base = {'uf': uf, 'cd': mun, 'municipio': mun_nome, 'cargo': cargo, 'rotulo': CARGOS.get(cargo, cargo),
            'eleicao': str(ele), 'gerado': agora()}
    saida_l = []
    for (z, l), g in sorted(locais.items()):
        info = g['info'] or {}
        d = fecha_grupo(g, nomes, fixo, top)
        d.update(id=f'{z4(z)}-{z4(l)}', zona=z4(z), local=z4(l), nm=info.get('nome') or ('?' if l else 'seções sem local'),
                 bairro=g['bairro'], endereco=info.get('endereco', ''), cep=info.get('cep', ''),
                 lat=float(info['lat']) if info.get('lat') else None, lon=float(info['lon']) if info.get('lon') else None)
        d['por_secao'] = [{k: v for k, v in s.items() if k != 'z'} for s in g['lista_secoes']]
        saida_l.append(d)
    saida_b = []
    for k, g in sorted(bairros.items(), key=lambda kv: kv[1]['nome']):
        d = fecha_grupo(g, nomes, fixo, top)
        pts = [(float(locais[x]['info']['lat']), float(locais[x]['info']['lon'])) for x in g['locais_set']
               if locais[x].get('info') and locais[x]['info'].get('lat')]
        d.update(id=slug(g['nome']), nm=g['nome'], locais=len(g['locais_set']),
                 lat=round(sum(p[0] for p in pts) / len(pts), 6) if pts else None,
                 lon=round(sum(p[1] for p in pts) / len(pts), 6) if pts else None)
        saida_b.append(d)
    return dict(base, locais=saida_l), dict(base, bairros=saida_b), cobertura


def compacta_secao(r, mun, uf):
    out = {k: r.get(k) for k in ('zona', 'secao', 'agregadas', 'status', 'st_tse', 'motivo', 'hash', 'hash_st',
                                 'recebido', 'arquivo', 'local', 'divergencia') if r.get(k) not in (None, [], '')}
    out.update(uf=uf, municipio=mun)
    bu = r.get('bu')
    if bu:
        out['bu'] = {k: bu.get(k) for k in ('fase', 'tipo_urna', 'tipo_arquivo', 'versao', 'emissao', 'abertura',
                                            'encerramento', 'lib_codigo', 'biometria')}
        out['eleicoes'] = bu['eleicoes']
    return out


# ----------------------------------------------------------------------------- validação
def valida(regs, v, fixo, ele, cargo):
    g = novo_grupo()
    for r in regs:
        soma_secao(g, r, ele, cargo)
    ab = v['abr'][0]
    linhas = []
    for c in sorted(ab.get('cand', []), key=lambda c: -int(c['vap'])):
        s = g['votos'].get(c['n'], 0)
        linhas.append((f"{c['n']} {(fixo.get(c['n'], {}).get('nm') or '')}".strip(), s, int(c['vap'])))
    extra = set(g['votos']) - {c['n'] for c in ab.get('cand', [])}
    for n in sorted(extra):
        linhas.append((f'{n} (fora do -v)', g['votos'][n], 0))
    anul_of = int(ab.get('van') or 0) + int(ab.get('vansj') or 0)
    anul = sum(q for n, q in g['votos'].items()
               if n in fixo and not (fixo[n].get('dvt') or 'Válido').startswith('Válido'))
    validos = sum(g['votos'].values()) - anul + g['legenda']
    linhas += [('Votos válidos', validos, int(ab['vv'])),
               ('Legenda (válidos - nominais)', g['legenda'], int(ab['vv']) - int(ab['vnom'])),
               ('Brancos', g['brancos'], int(ab['vb'])),
               ('Nulos (vn)', g['nulos'], int(ab['vn'])), ('Nulos total (tvn)', g['nulos'], int(ab['tvn'])),
               ('Anulados (van+vansj)', anul, anul_of),
               ('Comparecimento', g['comparecimento'], int(ab['c'])), ('Eleitorado apto', g['eleitorado'], int(ab['e'])),
               ('Abstenção', g['eleitorado'] - g['comparecimento'], int(ab['a'])),
               ('Seções totalizadas', g['secoes_totalizadas'], int(ab['st']))]
    ok = all(a == b for _, a, b in linhas)
    return linhas, ok


def imprime_validacao(titulo, linhas, ok):
    print(f'\nValidação — {titulo}: {"OK, bate exatamente" if ok else "DIVERGÊNCIA"}')
    print(f"  {'Item':<34} {'Soma das seções':>16} {'Oficial (-v)':>14} {'Dif.':>7}")
    for nome, a, b in linhas:
        print(f'  {nome[:34]:<34} {milhar(a):>16} {milhar(b):>14} {a - b:>7}')


def cmd_secoes(a, cli):
    tse = Tse(a.ambiente, a.ano)
    uf, mun = a.uf, a.mun
    saida = a.saida or os.path.join(SAIDA_PADRAO, f'{tse.ciclo}-p{a.pleito}', f'{uf}{mun}')
    os.makedirs(os.path.join(saida, 'secoes'), exist_ok=True)
    print(f'Varredura {tse.ciclo} pleito {a.pleito} {uf.upper()} {mun} (até {cli.conexoes} conexões)…', file=sys.stderr)
    regs, erros, dur = varre(cli, tse, a.pleito, uf, mun, a.limite, a.incluir_recebidas)
    for r in regs:
        grava_json(os.path.join(saida, 'secoes', f"z{r['zona']}-s{r['secao']}.json"), compacta_secao(r, mun, uf), True)
    st = collections.Counter(r['status'] for r in regs)
    tempos = sorted(r['ms'] for r in regs if 'ms' in r)
    print(f"\n{len(regs)} seções em {dur:.1f} s ({dur / max(1, len(regs)) * 1000:.0f} ms/seção em média com "
          f"{cli.conexoes} conexões; mediana por seção isolada {tempos[len(tempos) // 2] if tempos else 0} ms) — "
          f"{dict(st)}")
    print(f'Rede: {cli.resumo()}')
    for t, c in sorted(cli.por_tipo.items()):
        print(f"  {t:<6} {c['req']:>6} req  {c['bytes'] / 1e6:8.2f} MB  {c['ms'] / max(1, c['req']):6.0f} ms/req")
    if erros:
        print(f'{len(erros)} erros: {erros[:3]}')
    locais_bu = {(int(r['zona']), r['local']) for r in regs if r.get('local') is not None}
    mapa_locais, mapa_secoes = le_mapa(a.mapa)
    resumo = {'ciclo': tse.ciclo, 'pleito': a.pleito, 'uf': uf, 'municipio': mun, 'secoes': len(regs),
              'status': dict(st), 'duracao_s': round(dur, 1), 'rede': dict(cli.st),
              'por_tipo': {k: dict(v) for k, v in cli.por_tipo.items()}, 'locais_nos_bus': len(locais_bu),
              'mapa': a.mapa if mapa_locais else None, 'validacao': {}}
    if mapa_locais:
        fora = sorted(l for l in locais_bu if l not in mapa_locais)
        print(f'Mapa de locais: {len(mapa_locais)} locais no CSV; {len(locais_bu) - len(fora)} de {len(locais_bu)} locais '
              f'dos BUs encontrados' + (f'; fora do mapa: {fora[:12]}' if fora else ''))
        resumo['locais_fora_do_mapa'] = [f'{z4(z)}-{z4(l)}' for z, l in fora]
    ele = a.validar_ele
    if ele:
        muns = nomes_municipios(cli, tse, ele, uf)
        mun_nome = muns.get(mun, {}).get('nm', mun)
        for cargo in [z4(c) for c in a.cargos.split(',')]:
            v, fixo, _ = busca_municipio(cli, tse, ele, uf, mun, cargo)
            if v is None:
                print(f'(sem -v para cargo {cargo} na eleição {ele})')
                continue
            if not a.limite:
                linhas, ok = valida(regs, v, fixo, ele, cargo)
                imprime_validacao(f'{mun_nome} {CARGOS.get(cargo, cargo)} (eleição {ele})', linhas, ok)
                resumo['validacao'][cargo] = {'ok': ok, 'linhas': linhas}
            uf_r = cli.json(tse.r(ele, 'br' if cargo == '0001' else uf, cargo)) or {}
            nomes = {c['n']: {'nm': c.get('nm'), 'cc': c.get('cc'), 'st': c.get('st'), 'e': (c.get('e') or 'n').lower()}
                     for c in uf_r.get('cand', [])}
            for n, info in fixo.items():
                nomes.setdefault(n, {'nm': info['nm'], 'cc': cc_de(info), 'st': '', 'e': 'n'})
            top = None if cargo in MAJORITARIOS else a.top
            dl, db, cob = agrega_detalhe(regs, ele, cargo, mapa_locais, mapa_secoes, nomes, fixo, top, mun_nome, uf, mun)
            if cargo not in MAJORITARIOS:  # proporcionais: sem votos por seção (arquivo ficaria grande)
                for loc in dl['locais']:
                    for s in loc['por_secao']:
                        s.pop('v', None)
            fonte_mapa = next(iter(mapa_locais.values())).get('fonte') if mapa_locais else None
            for d in (dl, db):
                d['fonte'] = f'TSE — boletins de urna (resultados.tse.jus.br, {tse.ciclo}/arquivo-urna/{a.pleito})'
                d['mapa'] = {'fonte': fonte_mapa, 'cobertura': dict(cob)}
            grava_json(os.path.join(saida, f'{uf}{mun}-c{cargo}-locais.json'), dl)
            grava_json(os.path.join(saida, f'{uf}{mun}-c{cargo}-bairros.json'), db)
            print(f'  -> {uf}{mun}-c{cargo}-locais.json ({len(dl["locais"])} locais) e -bairros.json '
                  f'({len(db["bairros"])} bairros); cobertura do mapa: {dict(cob)}')
    grava_json(os.path.join(saida, 'resumo.json'), resumo)
    print(f'Saída: {saida}')


# ----------------------------------------------------------------------------- página /apuracao-2026/
def cmd_pagina(a, cli):
    tse = Tse(a.ambiente, a.ano)
    out = a.saida
    os.makedirs(out, exist_ok=True)
    cargos = [z4(c) for c in a.cargos.split(',')]
    ufs = UFS if a.ufs == 'todas' else a.ufs.split(',')
    muns_ufs = [] if a.municipios_uf in ('', 'nenhum') else a.municipios_uf.split(',')
    disponivel, n_arq = {}, 0
    ele_de = lambda c: a.federal if c == '0001' else a.estadual  # noqa: E731
    fixos, indice_bairros = {}, {}
    for cargo in cargos:
        ele = ele_de(cargo)
        abr, placar = [], []
        alvos = (['br'] + ufs) if cargo == '0001' else ufs
        res = dict(cli.mapa(lambda u: cli.json(tse.r(ele, u, cargo)), alvos))
        for u in alvos:
            r = res.get(u)
            if not r or isinstance(r, Exception) or not r.get('cand'):
                continue
            d = resultado_r(r)
            grava_json(os.path.join(out, f'{u}-c{cargo}.json'), d)
            n_arq += 1
            abr.append(u)
            if u != 'br':
                c = d['candidatos']
                placar.append({'uf': u, 'pct_apurado': d['secoes_totalizadas_pct'], 'lider': c[0]['nm'], 'n': c[0]['n'],
                               'cc': c[0]['cc'], 'pvap': c[0]['pvap'], 'st': c[0]['st'], 'e': c[0]['e'],
                               'segundo': c[1]['nm'] if len(c) > 1 else None,
                               'segundo_pvap': c[1]['pvap'] if len(c) > 1 else None})
        if placar:
            grava_json(os.path.join(out, f'placar-c{cargo}.json'), {'gerado': agora(), 'cargo': cargo, 'estados': placar})
            n_arq += 1
        for u in muns_ufs:
            if u not in abr:
                continue
            muns = nomes_municipios(cli, tse, ele, u)
            uf_r = res.get('br' if cargo == '0001' else u) or {}
            ccn = {c['n']: c for c in uf_r.get('cand', [])}

            def um(cd, u=u, ele=ele, cargo=cargo, ccn=ccn, muns=muns):
                v, fixo, _ = busca_municipio(cli, tse, ele, u, cd, cargo, fixos)
                return None if v is None else resultado_v(v, fixo, ccn, muns[cd]['nm'])
            lista = []
            for cd, d in cli.mapa(um, sorted(muns)):
                if isinstance(d, Exception) or d is None:
                    print(f'  (sem dados {u}{cd} c{cargo}: {d})', file=sys.stderr)
                    continue
                d.pop('final', None)
                grava_json(os.path.join(out, f'{u}{cd}-c{cargo}.json'), d)
                n_arq += 1
                lista.append({'cd': cd, 'nm': muns[cd]['nm'], 'capital': muns[cd].get('c') == 'S'})
            lista.sort(key=lambda m: sem_acento(m['nm']))
            grava_json(os.path.join(out, f'municipios-{u}-c{cargo}.json'), {'uf': u, 'cargo': cargo, 'municipios': lista})
            n_arq += 1
        if abr:
            disponivel[cargo] = {'rotulo': CARGOS.get(cargo, cargo), 'abr': abr}
        print(f'cargo {cargo}: {len(abr)} abrangências, placar {len(placar)} UFs  [{cli.resumo()}]', file=sys.stderr)
    # bairros / locais (varredura de seções)
    if a.bairros and a.pleito:
        mapa_locais, mapa_secoes = le_mapa(a.mapa)
        uf = a.bairros_uf
        for mun in a.bairros.split(','):
            regs, erros, dur = varre(cli, tse, a.pleito, uf, mun, None, False, progresso=False)
            print(f'seções {uf}{mun}: {len(regs)} em {dur:.1f} s ({len(erros)} erros)', file=sys.stderr)
            for cargo in cargos:
                ele = ele_de(cargo)
                v, fixo, _ = busca_municipio(cli, tse, ele, uf, mun, cargo, fixos)
                muns = nomes_municipios(cli, tse, ele, uf)
                uf_r = cli.json(tse.r(ele, 'br' if cargo == '0001' else uf, cargo)) or {}
                nomes = {c['n']: {'nm': c.get('nm'), 'cc': c.get('cc'), 'st': c.get('st'),
                                  'e': (c.get('e') or 'n').lower()} for c in uf_r.get('cand', [])}
                top = None if cargo in MAJORITARIOS else a.top
                dl, db, cob = agrega_detalhe(regs, ele, cargo, mapa_locais, mapa_secoes, nomes, fixo, top,
                                             muns.get(mun, {}).get('nm', mun), uf, mun)
                if cargo not in MAJORITARIOS:
                    for loc in dl['locais']:
                        for s in loc['por_secao']:
                            s.pop('v', None)
                fonte_mapa = next(iter(mapa_locais.values())).get('fonte') if mapa_locais else None
                for d in (dl, db):
                    d['fonte'] = f'TSE — boletins de urna ({tse.ciclo}/arquivo-urna/{a.pleito})'
                    d['mapa'] = {'fonte': fonte_mapa, 'cobertura': dict(cob)}
                grava_json(os.path.join(out, f'{uf}{mun}-c{cargo}-locais.json'), dl)
                grava_json(os.path.join(out, f'{uf}{mun}-c{cargo}-bairros.json'), db)
                n_arq += 2
                indice_bairros.setdefault(cargo, []).append(f'{uf}{mun}')
    ele_r = cli.json(tse.r(a.estadual, (ufs or ['mt'])[0], cargos[-1])) or {}
    indice = {'gerado': agora(), 'status': a.status,
              'eleicao': {'nome': a.nome or f'Eleições {a.ano}', 'data': ele_r.get('dt'), 'turno': ele_r.get('t') or str(a.turno)},
              'disponivel': disponivel, 'arquivos': n_arq + 1, 'tem_municipios': bool(muns_ufs),
              'bairros': indice_bairros, 'fonte': 'TSE — resultados.tse.jus.br'}
    if a.status != 'apurando':
        indice['motivo'] = a.motivo or 'Aguardando a liberação dos dados pelo TSE.'
    grava_json(os.path.join(out, 'indice.json'), indice)
    print(f'{n_arq + 1} arquivos em {out}  [{cli.resumo()}]')


# ----------------------------------------------------------------------------- CLI
def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--ambiente', default='oficial', choices=['oficial', 'simulado'])
    p.add_argument('--cache', default=CACHE_PADRAO)
    p.add_argument('--conexoes', type=int, default=MAX_CONEXOES, help='conexões simultâneas (máx. 8)')
    p.add_argument('--revalidar', type=float, default=None,
                   help='segundos antes de revalidar um arquivo mutável (ETag). Padrão: 0 no ano corrente, nunca em anos passados')
    p.add_argument('--offline', action='store_true', help='usa só o cache em disco')
    sp = p.add_subparsers(dest='cmd', required=True)
    c = sp.add_parser('config', help='lista eleições/pleitos do ele-c.json')
    c.add_argument('--todos', action='store_true', help='inclui eleições suplementares antigas')
    m = sp.add_parser('municipio', help='resultado consolidado de um município (-v + -f)')
    for x in ('ano', 'ele', 'uf', 'mun', 'cargo'):
        m.add_argument(f'--{x}', required=True)
    m.add_argument('--json', action='store_true', help='imprime no formato da página')
    s = sp.add_parser('secoes', help='BU de cada seção + agregados por local/bairro + validação')
    for x in ('ano', 'pleito', 'uf', 'mun'):
        s.add_argument(f'--{x}', required=True)
    s.add_argument('--limite', type=int)
    s.add_argument('--validar-ele', help='código da eleição para validar e gerar -locais/-bairros (ex.: 546)')
    s.add_argument('--cargos', default='0003', help='cargos da eleição --validar-ele, ex.: 0003,0005')
    s.add_argument('--mapa', default=MAPA_PADRAO, help='CSV local de votação -> bairro')
    s.add_argument('--top', type=int, default=30, help='candidatos por local/bairro nos cargos proporcionais')
    s.add_argument('--incluir-recebidas', action='store_true', help='usa BUs recebidos ainda não totalizados')
    s.add_argument('--saida')
    lo = sp.add_parser('locais', help='mapa local de votação -> bairro a partir do dataset do TSE')
    lo.add_argument('--entrada', required=True, help='eleitorado_local_votacao_<ano>.zip|.csv (TSE) ou espelho .json/URL')
    lo.add_argument('--uf', default='mt')
    lo.add_argument('--mun', default='90670,91677')
    lo.add_argument('--turno', type=int, default=1)
    lo.add_argument('--ano')
    lo.add_argument('--fonte')
    lo.add_argument('--saida', default=MAPA_PADRAO)
    pg = sp.add_parser('pagina', help='gera os JSON de /content/media/apuracao/')
    pg.add_argument('--ano', required=True)
    pg.add_argument('--turno', default='1')
    pg.add_argument('--federal', required=True, help='eleição federal (presidente), ex.: 544')
    pg.add_argument('--estadual', required=True, help='eleição estadual, ex.: 546')
    pg.add_argument('--pleito', help='pleito do arquivo-urna (bairros/locais), ex.: 406')
    pg.add_argument('--cargos', default='0001,0003,0005')
    pg.add_argument('--ufs', default='todas', help="'todas' ou lista (mt,go,...)")
    pg.add_argument('--municipios-uf', default='mt', help="UFs com arquivos por município ('nenhum' para pular)")
    pg.add_argument('--bairros', default='90670,91677', help='municípios com -bairros/-locais (vazio para pular)')
    pg.add_argument('--bairros-uf', default='mt')
    pg.add_argument('--mapa', default=MAPA_PADRAO)
    pg.add_argument('--top', type=int, default=30)
    pg.add_argument('--nome', help="nome da eleição no indice.json (com 'SIMULAÇÃO' a página mostra o aviso de demonstração)")
    pg.add_argument('--status', default='apurando')
    pg.add_argument('--motivo')
    pg.add_argument('--saida', required=True)
    a = p.parse_args(argv)
    if a.cmd == 'locais':
        return cmd_locais(a)
    rev = a.revalidar
    if rev is None:
        ano = int(getattr(a, 'ano', 0) or 0)
        rev = float('inf') if ano and ano < dt.date.today().year else 0.0
    cli = Cliente(a.cache, a.conexoes, revalidar=rev, offline=a.offline)
    try:
        {'config': cmd_config, 'municipio': cmd_municipio, 'secoes': cmd_secoes, 'pagina': cmd_pagina}[a.cmd](a, cli)
    finally:
        cli.pool.shutdown(wait=False, cancel_futures=True)


if __name__ == '__main__':
    main()
