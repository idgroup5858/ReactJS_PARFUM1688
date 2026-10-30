/**
 * Telegram Bot API turlari va yordamchilar. Botning o'zi serverda (NestJS_PARFUM1688 → `/api/telegram/*`): token,
 * yangilanishlar va xabar yuborish brauzerda emas.
 */

export interface TgUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TgBotInfo extends TgUser {
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
  has_main_web_app?: boolean
}

export interface TgBotCommand {
  command: string
  description: string
}

export type TgMenuButton =
  | { type: 'commands' }
  | { type: 'default' }
  | { type: 'web_app'; text: string; web_app: { url: string } }

const TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{30,}$/

/** @BotFather bergan tokenning ko'rinishi: "123456789:AA..." */
export function isTokenLike(token: string): boolean {
  return TOKEN_PATTERN.test(token.trim())
}

/** Mini App ochiladigan tugma: Telegram faqat https manzilni qabul qiladi. */
export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/** HTML parse_mode uchun matnni xavfsiz qilish (foydalanuvchi ismi, atir nomi...). */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char)
}
