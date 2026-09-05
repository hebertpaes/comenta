// Executa via Ghost Admin API: upload dos banners, code injection do banner
// ABACS nas matérias e webhook do hojemt-zap. Chave via env GHOST_ADMIN_KEY.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const SITE = 'https://hojemt.com.br'
const KEY = process.env.GHOST_ADMIN_KEY || ''
const [KID, SECRET] = KEY.split(':')
if (!KID || !SECRET) { console.error('chave ausente'); process.exit(1) }

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'HS256', typ: 'JWT', kid: KID })
  const payload = b64({ iat: now, exp: now + 300, aud: '/admin/' })
  const sig = crypto
    .createHmac('sha256', Buffer.from(SECRET, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

async function api(method, p, body, isForm) {
  const headers = { Authorization: `Ghost ${jwt()}`, 'Accept-Version': 'v5.0' }
  if (body && !isForm) headers['content-type'] = 'application/json'
  const res = await fetch(`${SITE}/ghost/api/admin/${p}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 300) } }
  if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${JSON.stringify(json.errors || json).slice(0, 400)}`)
  return json
}

async function upload(file) {
  const buf = fs.readFileSync(file)
  const name = path.basename(file)
  const type = name.endsWith('.gif') ? 'image/gif' : name.endsWith('.mp4') ? 'video/mp4' : 'image/png'
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type }), name)
  fd.append('ref', name)
  const out = await api('POST', name.endsWith('.mp4') ? 'media/upload/' : 'images/upload/', fd, true)
  const url = (out.images || out.media)[0].url
  console.log('upload:', name, '->', url)
  return url
}

const MARK_START = '<!-- abacs-banner:start -->'
const MARK_END = '<!-- abacs-banner:end -->'

function snippet(gifUrl) {
  return `${MARK_START}
<script>
(function () {
  if (!/\\bpost-template\\b/.test(document.body.className)) return;
  if (document.getElementById('abacs-banner')) return;
  var c = document.querySelector('.gh-content') || document.querySelector('.post-content') || document.querySelector('article');
  if (!c) return;
  var a = document.createElement('a');
  a.id = 'abacs-banner';
  a.href = 'https://abacs.org.br/loja_virtual/index.php';
  a.target = '_blank';
  a.rel = 'noopener sponsored';
  a.style.cssText = 'display:block;margin:28px auto;max-width:1200px;';
  var img = document.createElement('img');
  img.src = '${gifUrl}';
  img.alt = 'ABACS — mais de 120 cursos online com certificado, por R$ 99';
  img.loading = 'lazy';
  img.style.cssText = 'width:100%;height:auto;display:block;border-radius:6px;';
  a.appendChild(img);
  var ps = c.querySelectorAll('p');
  if (ps.length >= 6) { ps[Math.floor(ps.length / 2)].after(a); } else { c.appendChild(a); }
})();
</script>
${MARK_END}`
}

;(async () => {
  const site = await api('GET', 'site/')
  console.log('autenticado em:', site.site.title, '| Ghost', site.site.version)

  const dir = path.join(__dirname, '..', 'banners')
  const gifUrl = await upload(path.join(dir, 'abacs-banner-artigo-1200x160.gif'))
  await upload(path.join(dir, 'abacs-retangulo-300x250.gif'))
  await upload(path.join(dir, 'fakenews-rosto-voz-ia-1200x120.png'))
  await upload(path.join(dir, 'abacs-story-1080x1920.png'))

  // code injection: preserva o conteúdo atual, substitui/insere só o nosso bloco.
  // Tokens de INTEGRAÇÃO não podem editar settings no Ghost 5/6 — nesse caso
  // imprimimos o bloco para colar manualmente (ou use um Staff Access Token).
  const block = snippet(gifUrl)
  try {
    const settings = await api('GET', 'settings/')
    const foot = settings.settings.find((s) => s.key === 'codeinjection_foot')
    let value = (foot && foot.value) || ''
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`)
    value = re.test(value) ? value.replace(re, block) : (value ? value + '\n' : '') + block
    await api('PUT', 'settings/', { settings: [{ key: 'codeinjection_foot', value }] })
    console.log('code injection atualizado (banner ABACS nas matérias)')
  } catch (err) {
    console.log('\n>> Sem permissão para editar o code injection com este token.')
    console.log('>> Cole o bloco abaixo em Settings -> Code injection -> Site footer:')
    console.log('\n' + block + '\n')
  }

  // webhook do hojemt-zap
  const token = crypto.randomBytes(24).toString('hex')
  const hooks = await api('GET', 'webhooks/').catch(() => null)
  try {
    await api('POST', 'webhooks/', {
      webhooks: [{
        event: 'post.published',
        name: 'hojemt-zap',
        target_url: `http://localhost:3900/webhook/ghost?token=${token}`,
      }],
    })
    console.log('webhook criado (post.published -> localhost:3900)')
    console.log('WEBHOOK_TOKEN=' + token)
  } catch (err) {
    console.log('webhook: ' + err.message)
  }
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1) })
