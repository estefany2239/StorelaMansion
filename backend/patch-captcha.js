const fs = require('fs')
const p = 'backend/src/middlewares/verificarCaptcha.js'
let s = fs.readFileSync(p, 'utf8')
const old = "console.error(`[captcha] siteverify respondió ${respuesta.status}`)"
const neu = "console.error(`[captcha] siteverify status=${respuesta.status}`); const _dbg = await respuesta.clone().text(); console.error('DEBUG_SITEVERIFY', _dbg)"
if (!s.includes(old)) { console.log('OLD NOT FOUND'); process.exit(1) }
s = s.replace(old, neu)
fs.writeFileSync(p, s)
console.log('done')
