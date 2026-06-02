import type { ParserPlugin } from '../../plugin.js'

export const hyundaiPlugin: ParserPlugin = {
  id: 'hyundai-it',
  displayName: 'Hyundai',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('hyundai'))
    add(0.4, /phev.*maxpower/.test(t) || /elektrische reichweite/.test(t))
    add(0.2, t.includes('bluelink'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('hyundai'))
    add(0.3, /hyundai\s+financial/.test(t))
    add(0.2, t.includes('bluelink') || /la tua hyundai/.test(t))
    return total > 0 ? score / total : 0
  },
}
