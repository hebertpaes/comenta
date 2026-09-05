// Ponte Ghost -> WhatsApp (WAHA ou Evolution API)
// Recebe o webhook "post.published" do Ghost e envia a chamada da matéria
// para os grupos/canais configurados.

const http = require('http')
const ig = require('./instagram.js')

const PORT = Number(process.env.PORT || 3900)
const PROVIDER = (process.env.WA_PROVIDER || 'waha').toLowerCase() // waha | evolution
const WA_URL = (process.env.WA_URL || 'http://localhost:8080').replace(/\/$/, '')
const WA_API_KEY = process.env.WA_API_KEY || ''
const WA_SESSION = process.env.WA_SESSION || 'default' // WAHA: session | Evolution: instance
const CHAT_IDS = (process.env.WA_CHAT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '' // ?token=... na URL do webhook

// Evita reenvio quando o Ghost dispara o webhook mais de uma vez para o mesmo post.
const sent = new Map()
function alreadySent(id) {
  const now = Date.now()
  for (const [k, t] of sent) if (now - t > 6 * 3600e3) sent.delete(k)
  if (sent.has(id)) return true
  sent.set(id, now)
  return false
}

function buildMessage(post) {
  const lines = [`*${post.title || 'Nova matéria'}*`]
  const excerpt = (post.custom_excerpt || post.excerpt || '').trim()
  if (excerpt) lines.push('', excerpt.slice(0, 280))
  if (post.url) lines.push('', `📰 Leia: ${post.url}`)
  lines.push('', '_HojeMT · hojemt.com.br_')
  return lines.join('\n')
}

async function sendText(chatId, text) {
  let url, body, headers
  if (PROVIDER === 'evolution') {
    url = `${WA_URL}/message/sendText/${encodeURIComponent(WA_SESSION)}`
    body = { number: chatId, text }
    headers = { 'content-type': 'application/json', apikey: WA_API_KEY }
  } else {
    url = `${WA_URL}/api/sendText`
    body = { session: WA_SESSION, chatId, text }
    headers = { 'content-type': 'application/json', 'X-Api-Key': WA_API_KEY }
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const out = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${out.slice(0, 300)}`)
  return out
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')

  if (req.method === 'GET' && u.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, provider: PROVIDER, chats: CHAT_IDS.length }))
  }

  if (req.method === 'POST' && u.pathname === '/webhook/ghost') {
    if (WEBHOOK_TOKEN && u.searchParams.get('token') !== WEBHOOK_TOKEN) {
      res.writeHead(401)
      return res.end('token inválido')
    }
    let raw = ''
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) req.destroy() })
    req.on('end', async () => {
      // Responde já para o Ghost não reenviar por timeout.
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
      try {
        const payload = JSON.parse(raw || '{}')
        const post = payload?.post?.current || payload?.post || {}
        if (!post.title && !post.url) return
        if (post.id && alreadySent(post.id)) {
          return console.log(`[skip] já enviado: ${post.title}`)
        }
        const text = buildMessage(post)
        for (const chat of CHAT_IDS) {
          try {
            await sendText(chat, text)
            console.log(`[ok] "${post.title}" -> ${chat}`)
          } catch (err) {
            console.error(`[erro] ${chat}: ${err.message}`)
          }
          await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000))
        }
        // Instagram: matéria com imagem de destaque vira post no feed.
        if (ig.enabled() && post.feature_image) {
          try {
            const id = await ig.publishPhoto({
              imageUrl: post.feature_image,
              caption: ig.buildCaption(post),
            })
            console.log(`[ok] "${post.title}" -> instagram (${id})`)
          } catch (err) {
            console.error(`[erro] instagram: ${err.message}`)
          }
        }
      } catch (err) {
        console.error('[erro] payload:', err.message)
      }
    })
    return
  }

  // Envio manual: curl -X POST /send -d '{"text":"...","chatId":"opcional"}'
  if (req.method === 'POST' && u.pathname === '/send') {
    if (WEBHOOK_TOKEN && u.searchParams.get('token') !== WEBHOOK_TOKEN) {
      res.writeHead(401)
      return res.end('token inválido')
    }
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', async () => {
      try {
        const { text, chatId } = JSON.parse(raw || '{}')
        const targets = chatId ? [chatId] : CHAT_IDS
        for (const t of targets) await sendText(t, text)
        res.writeHead(200)
        res.end('enviado')
      } catch (err) {
        res.writeHead(500)
        res.end('erro: ' + err.message)
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`hojemt-zap na porta ${PORT} | provider=${PROVIDER} | ${CHAT_IDS.length} destino(s)`)
  if (!WA_API_KEY) console.warn('AVISO: WA_API_KEY vazio')
  if (CHAT_IDS.length === 0) console.warn('AVISO: WA_CHAT_IDS vazio — nada será enviado')
})
