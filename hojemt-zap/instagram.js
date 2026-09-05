// Publicação no Instagram (@hoje.mt) via API oficial (Instagram Graph API).
// Exige conta profissional (Business/Creator) vinculada a uma Página do
// Facebook e um token com as permissões instagram_basic +
// instagram_content_publish (ver README, seção Instagram).

const IG_API_BASE = (process.env.IG_API_BASE || 'https://graph.facebook.com/v21.0').replace(/\/$/, '')
const IG_USER_ID = process.env.IG_USER_ID || ''
const IG_TOKEN = process.env.IG_TOKEN || ''

function enabled() {
  return Boolean(IG_USER_ID && IG_TOKEN)
}

async function api(path, params) {
  const url = new URL(`${IG_API_BASE}/${path}`)
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v)
  url.searchParams.set('access_token', IG_TOKEN)
  const res = await fetch(url, { method: 'POST' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`IG ${path}: ${res.status} ${JSON.stringify(body.error || body).slice(0, 300)}`)
  }
  return body
}

async function waitReady(creationId, timeoutMs = 5 * 60e3) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const url = new URL(`${IG_API_BASE}/${creationId}`)
    url.searchParams.set('fields', 'status_code')
    url.searchParams.set('access_token', IG_TOKEN)
    const res = await fetch(url)
    const body = await res.json().catch(() => ({}))
    const status = body.status_code
    if (status === 'FINISHED') return
    if (status === 'ERROR') throw new Error('IG: processamento do vídeo falhou')
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('IG: tempo esgotado aguardando o processamento do vídeo')
}

/** Post de foto no feed (ex.: matéria com feature_image). */
async function publishPhoto({ imageUrl, caption }) {
  if (!enabled()) throw new Error('IG_USER_ID/IG_TOKEN não configurados')
  const media = await api(`${IG_USER_ID}/media`, { image_url: imageUrl, caption })
  const pub = await api(`${IG_USER_ID}/media_publish`, { creation_id: media.id })
  return pub.id
}

/** Reel (vídeo de corte). O MP4 precisa estar em uma URL pública. */
async function publishReel({ videoUrl, caption, coverUrl }) {
  if (!enabled()) throw new Error('IG_USER_ID/IG_TOKEN não configurados')
  const params = { media_type: 'REELS', video_url: videoUrl, caption }
  if (coverUrl) params.cover_url = coverUrl
  const media = await api(`${IG_USER_ID}/media`, params)
  await waitReady(media.id)
  const pub = await api(`${IG_USER_ID}/media_publish`, { creation_id: media.id })
  return pub.id
}

function buildCaption(post) {
  const lines = [post.title || '']
  const excerpt = (post.custom_excerpt || post.excerpt || '').trim()
  if (excerpt) lines.push('', excerpt.slice(0, 400))
  lines.push('', '📰 Matéria completa no site: hojemt.com.br (link na bio)')
  lines.push('', '#HojeMT #MatoGrosso #Notícias')
  return lines.join('\n').slice(0, 2200)
}

module.exports = { enabled, publishPhoto, publishReel, buildCaption }
