// Graph API falsa para teste local do publicador de Instagram.
const http = require('http')
const events = []
let statusPolls = 0
http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x')
    const send = (obj) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }
    if (u.pathname === '/__events') return send(events)
    if (u.searchParams.get('access_token') !== 'tok-ig' && !u.pathname.startsWith('/__')) {
      res.writeHead(401)
      return res.end('{"error":{"message":"bad token"}}')
    }
    if (req.method === 'POST' && u.pathname.endsWith('/media')) {
      events.push({ op: 'media', params: Object.fromEntries(u.searchParams) })
      return send({ id: 'creation-1' })
    }
    if (req.method === 'POST' && u.pathname.endsWith('/media_publish')) {
      events.push({ op: 'publish', params: Object.fromEntries(u.searchParams) })
      return send({ id: 'post-1' })
    }
    if (req.method === 'GET' && u.pathname === '/creation-1') {
      statusPolls++
      return send({ status_code: statusPolls >= 2 ? 'FINISHED' : 'IN_PROGRESS' })
    }
    res.writeHead(404)
    res.end('{}')
  })
  .listen(8082, () => console.log('[mock-graph] na porta 8082'))
