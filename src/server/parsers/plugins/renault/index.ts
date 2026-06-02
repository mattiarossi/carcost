import type { ParserPlugin } from '../../plugin.js'

export const renaultPlugin: ParserPlugin = {
  id: 'renault-it',
  displayName: 'Renault',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('renault'))
    add(0.3, /potenza massima kw cee/.test(t))
    add(0.2, t.includes('e-tech'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('renault'))
    add(0.3, t.includes('easy life') || t.includes('renault financial'))
    add(0.2, /configurazione del/.test(t))
    return total > 0 ? score / total : 0
  },
}
