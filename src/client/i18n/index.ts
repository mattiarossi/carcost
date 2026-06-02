import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import it from './it.json'

const savedLang = typeof localStorage !== 'undefined'
  ? (localStorage.getItem('carcost_lang') ?? 'en')
  : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export function setLanguage(lang: 'en' | 'it') {
  i18n.changeLanguage(lang)
  localStorage.setItem('carcost_lang', lang)
}

export default i18n
