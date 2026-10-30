// vite.config.ts ham shu faylni import qiladi (Node muhitida), shuning uchun importlar kengaytma bilan yozilgan
import { CUSTOMER_ACCENT_STORAGE_KEY, CUSTOMER_THEME_STORAGE_KEY, SETTINGS_STORAGE_KEY, STAFF_PATH_PREFIXES } from '../store/storageKeys.ts'
import { ACCENTS, DEFAULT_ACCENT_ID, accentVars } from './accents.ts'

/**
 * index.html <head> iga qo'yiladigan kichik skript: mavzu (`.dark`) va asosiy rang (`data-accent` + `--accent*`)
 * React yuklanishidan oldin qo'llanadi. Xodimlar qismida — qurilma sozlamasi, mijoz ilovasida — OS mavzusi va do'kon
 * rangi. Ilova ishlayotgandagi ekvivalenti — theme/appearance.ts; ikkalasi bir xil natija berishi shart.
 */
export function buildThemeInitScript(): string {
  const customAccents = Object.fromEntries(
    ACCENTS.filter((accent) => accent.id !== DEFAULT_ACCENT_ID).map((accent) => [accent.id, accentVars(accent)]),
  )
  return [
    'try{',
    `var d=document.documentElement,P=location.pathname,S=${JSON.stringify(STAFF_PATH_PREFIXES)}.some(function(x){return P===x||P.indexOf(x+"/")===0}),`,
    'M=matchMedia("(prefers-color-scheme: dark)").matches,a,dk;',
    `if(S){var p=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)})||"{}")||{};a=p.accentId;dk=p.themeMode==="dark"||(p.themeMode==="system"&&M)}`,
    // mijoz: o'zi tanlagan mavzu (true / false), tanlamagan bo'lsa — qurilma mavzusi (Telegram'niki keyin React'da)
    `else{a=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOMER_ACCENT_STORAGE_KEY)})||"null");var u=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOMER_THEME_STORAGE_KEY)})||"null");dk=typeof u==="boolean"?u:M}`,
    'if(dk)d.classList.add("dark");',
    `var m=${JSON.stringify(customAccents)};`,
    'if(a&&Object.prototype.hasOwnProperty.call(m,a)){d.setAttribute("data-accent",a);for(var k in m[a])d.style.setProperty(k,m[a][k])}',
    '}catch(e){}',
  ].join('')
}
