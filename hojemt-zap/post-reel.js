#!/usr/bin/env node
// Publica um vídeo de corte como Reel no Instagram.
// Uso: node post-reel.js https://hojemt.com.br/content/media/corte1.mp4 "Legenda do reel"
// Requer IG_USER_ID e IG_TOKEN no ambiente (ou em /etc/hojemt-zap.env).

const ig = require('./instagram.js')

const [videoUrl, ...captionParts] = process.argv.slice(2)
if (!videoUrl || !/^https?:\/\//.test(videoUrl)) {
  console.error('Uso: node post-reel.js <URL_publica_do_mp4> "legenda"')
  process.exit(1)
}
const caption =
  captionParts.join(' ') ||
  '📰 HojeMT — notícias de Mato Grosso. Matéria completa no site (link na bio).\n\n#HojeMT #MatoGrosso'

ig.publishReel({ videoUrl, caption })
  .then((id) => console.log('Reel publicado, id:', id))
  .catch((err) => {
    console.error('Falhou:', err.message)
    process.exit(1)
  })
