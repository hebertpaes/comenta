// WAHA falso para teste local: registra as mensagens recebidas.
const http = require('http')
const received = []
http
  .createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/api/sendText') {
        const body = JSON.parse(raw)
        if (req.headers['x-api-key'] !== 'chave-teste') {
          res.writeHead(401)
          return res.end('{"error":"bad key"}')
        }
        received.push(body)
        console.log('[mock-waha] recebido para', body.chatId)
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end('{"ok":true}')
      }
      if (req.url === '/__received') {
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(JSON.stringify(received))
      }
      res.writeHead(404)
      res.end()
    })
  })
  .listen(8081, () => console.log('[mock-waha] na porta 8081'))
