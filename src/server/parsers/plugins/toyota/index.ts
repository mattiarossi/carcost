import type { ParserPlugin } from '../../plugin.js'

export const toyotaPlugin: ParserPlugin = {
  id: 'toyota-it',
  displayName: 'Toyota',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('toyota'))
    add(0.3, /configura\s+/.test(t))
    add(0.3, t.includes('financial services toyota') || t.includes('toyota financial'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('toyota'))
    add(0.3, t.includes('toyota easy next') || t.includes('easy next'))
    add(0.3, t.includes('financial services toyota') || t.includes('toyota financial'))
    return total > 0 ? score / total : 0
  },
}
