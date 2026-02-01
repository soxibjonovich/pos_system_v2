// src/i18n/LanguageSwitcher.tsx

import { useI18n } from './i18nContext'
import { Lang } from './translations'

const LANGS: { key: Lang, label: string, flag: string }[] = [
  { key: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
]

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex gap-1">
      {LANGS.map(l => (
        <button
          key={l.key}
          onClick={() => setLang(l.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            lang === l.key
              ? dark ? 'bg-white text-gray-900' : 'bg-indigo-600 text-white'
              : dark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  )
}