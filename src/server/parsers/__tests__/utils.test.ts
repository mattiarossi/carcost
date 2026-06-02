import { describe, it, expect } from 'vitest'
import { normaliseText, normaliseKey } from '../utils.js'

describe('normaliseText', () => {
  it('collapses multiple spaces',       () => expect(normaliseText('a  b   c')).toBe('a b c'))
  it('repairs PDF split word T otale',  () => expect(normaliseText('Altezza T otale')).toBe('Altezza Totale'))
  it('repairs PDF split WL TP',         () => expect(normaliseText('Ciclo WL TP')).toBe('Ciclo WLTP'))
  it('normalises CRLF',                 () => expect(normaliseText('a\r\nb')).toBe('a\nb'))
})

describe('normaliseKey', () => {
  it('strips unit parens',    () => expect(normaliseKey('Consumo Ciclo Misto (L/100 Km)')).toBe('Consumo Ciclo Misto'))
  it('strips multiple parens',() => expect(normaliseKey('Potenza Massima KW CEE (Cv)')).toBe('Potenza Massima KW CEE'))
  it('strips brackets',       () => expect(normaliseKey('Autonomia [km]')).toBe('Autonomia'))
  it('collapses spaces',      () => expect(normaliseKey('CO2  Ciclo  Misto  (G/Km)')).toBe('CO2 Ciclo Misto'))
  it('leaves plain keys unchanged', () => expect(normaliseKey('consumo combinato')).toBe('consumo combinato'))
})
