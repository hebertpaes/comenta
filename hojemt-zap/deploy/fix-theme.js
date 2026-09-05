// Corrige o aviso "Use or remove the unused config.custom setting" do tema
// ativo do Ghost: baixa o tema via Admin API, remove do package.json apenas
// as chaves de config.custom que nenhum template referencia (@custom.x),
// guarda um backup do zip original e reenvia o tema corrigido.
//
// Uso (precisa de node >= 18 e dos utilitários zip/unzip — padrão no macOS):
//   GHOST_ADMIN_KEY='id:segredo' node hojemt-zap/deploy/fix-theme.js

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const SITE = 'https://hojemt.com.br'
const KEY = process.env.GHOST_ADMIN_KEY || ''
const [KID, SECRET] = KEY.split(':')
if (!KID || !SECRET) { console.error('defina GHOST_ADMIN_KEY'); process.exit(1) }

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'HS256', typ: 'JWT', kid: KID })
  const payload = b64({ iat: now, exp: now + 300, aud: '/admin/' })
  const sig = crypto.createHmac('sha256', Buffer.from(SECRET, 'hex'))
    .update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

async function api(method, p, { form, raw } = {}) {
  const headers = { Authorization: `Ghost ${jwt()}`, 'Accept-Version': 'v5.0' }
  const res = await fetch(`${SITE}/ghost/api/admin/${p}`, { method, headers, body: form })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${p}: ${res.status} ${text.slice(0, 300)}`)
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json()
}

;(async () => {
  const { themes } = await api('GET', 'themes/')
  const active = themes.find((t) => t.active)
  if (!active) throw new Error('nenhum tema ativo encontrado')
  console.log('tema ativo:', active.name, active.package?.version || '')

  const zipBuf = await api('GET', `themes/${encodeURIComponent(active.name)}/download/`, { raw: true })
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tema-'))
  const zipPath = path.join(work, 'tema.zip')
  fs.writeFileSync(zipPath, zipBuf)
  const backup = path.join(process.cwd(), `backup-tema-${active.name}.zip`)
  fs.copyFileSync(zipPath, backup)
  console.log('backup salvo em:', backup)

  const src = path.join(work, 'src')
  fs.mkdirSync(src)
  execFileSync('unzip', ['-q', zipPath, '-d', src])

  // o zip pode ter uma pasta raiz ou os arquivos soltos
  let root = src
  const entries = fs.readdirSync(src)
  if (entries.length === 1 && fs.statSync(path.join(src, entries[0])).isDirectory()) {
    root = path.join(src, entries[0])
  }
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const custom = pkg.config && pkg.config.custom
  if (!custom || Object.keys(custom).length === 0) {
    console.log('package.json não tem config.custom preenchido — nada a corrigir aqui.')
    if (pkg.config && 'custom' in pkg.config) {
      delete pkg.config.custom
    } else {
      process.exit(0)
    }
  } else {
    // procura @custom.<chave> em todos os .hbs
    const used = new Set()
    const walk = (d) => {
      for (const f of fs.readdirSync(d)) {
        const fp = path.join(d, f)
        if (fs.statSync(fp).isDirectory()) walk(fp)
        else if (f.endsWith('.hbs')) {
          const body = fs.readFileSync(fp, 'utf8')
          for (const k of Object.keys(custom)) {
            if (body.includes(`@custom.${k}`)) used.add(k)
          }
        }
      }
    }
    walk(root)
    const unused = Object.keys(custom).filter((k) => !used.has(k))
    console.log('chaves usadas nos templates:', [...used].join(', ') || '(nenhuma)')
    console.log('chaves não usadas (serão removidas):', unused.join(', ') || '(nenhuma)')
    if (unused.length === 0) {
      console.log('todas as chaves são usadas — o aviso deve ser outro; nada alterado.')
      process.exit(0)
    }
    for (const k of unused) delete custom[k]
    if (Object.keys(custom).length === 0) delete pkg.config.custom
    if (pkg.config && Object.keys(pkg.config).length === 0) delete pkg.config
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  const fixedZip = path.join(work, 'tema-corrigido.zip')
  execFileSync('zip', ['-qr', fixedZip, '.'], { cwd: root })

  const form = new FormData()
  form.append('file', new Blob([fs.readFileSync(fixedZip)], { type: 'application/zip' }), `${active.name}.zip`)
  const out = await api('POST', 'themes/upload/', { form })
  const t = out.themes && out.themes[0]
  console.log('tema reenviado:', t?.name, '| avisos restantes:', (t?.gscan_errors || []).length + (t?.warnings || []).length || 0)

  await api('PUT', `themes/${encodeURIComponent(active.name)}/activate/`).catch(() => {})
  console.log('pronto — recarregue o admin; o alerta "Your theme has errors" deve sumir.')
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1) })
