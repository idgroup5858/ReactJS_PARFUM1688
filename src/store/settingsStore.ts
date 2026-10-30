import type { Lang } from '@/domain/types'
import { ACCENTS, DEFAULT_ACCENT_ID } from '@/theme/accents'
import { createStore, useStore } from './createStore'
import { onStorageChange, readJson, writeJson } from './storage'
import { SETTINGS_STORAGE_KEY } from './storageKeys'

export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark']

/** Xodim qurilmasining sozlamalari (kassa va admin): mavzu, rang, til. Mijoz ilovasi o'z mavzusi va tilini tanlaydi. */
export interface AppSettings {
  themeMode: ThemeMode
  accentId: string
  lang: Lang
}

function sanitize(raw: unknown): AppSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof AppSettings, unknown>>
  return {
    themeMode: THEME_MODES.find((mode) => mode === value.themeMode) ?? 'light',
    accentId: ACCENTS.find((accent) => accent.id === value.accentId)?.id ?? DEFAULT_ACCENT_ID,
    lang: value.lang === 'ru' ? 'ru' : 'uz',
  }
}

export const settingsStore = createStore<AppSettings>(sanitize(readJson(SETTINGS_STORAGE_KEY)))

// boshqa tabda o'zgartirilgan sozlamalar shu tabda ham darhol qo'llanadi
onStorageChange(SETTINGS_STORAGE_KEY, () => settingsStore.set(sanitize(readJson(SETTINGS_STORAGE_KEY))))

export function useSettings(): AppSettings {
  return useStore(settingsStore)
}

function save(patch: Partial<AppSettings>): void {
  const next = { ...settingsStore.get(), ...patch }
  settingsStore.set(next)
  writeJson(SETTINGS_STORAGE_KEY, next)
}

export const setThemeMode = (themeMode: ThemeMode) => save({ themeMode })

export const setAccent = (accentId: string) => save({ accentId })

export const setStaffLang = (lang: Lang) => save({ lang })
