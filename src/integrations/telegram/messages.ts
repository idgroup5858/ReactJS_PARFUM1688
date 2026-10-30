import { FULFILLMENT_LABEL } from '@/domain/labels'
import { orderTotals } from '@/domain/orders'
import type { Db, Order, OrderStatus } from '@/domain/types'
import { addDays, todayKey } from '@/lib/dates'
import { formatDate, formatNumber, formatOrderNumber, formatPhone } from '@/lib/format'
import { staffLang, tr } from '@/staff/i18n'
import { escapeHtml } from './api'

/** Bot yuboradigan xabarlar matni: mijozga — uning tilida (RU / UZ), xodimlarga — xodim tanlagan tilda (yuborilgan paytdagi). */

/** Mijozga xabar qilinadigan holatlar ("Tayyorlanmoqda" — ichki bosqich, xabarsiz). */
export const CUSTOMER_NOTIFY_STATUSES: OrderStatus[] = ['accepted', 'ready', 'done', 'cancelled']

const money = (value: number, lang: 'ru' | 'uz') => `${formatNumber(value)} ${lang === 'ru' ? 'сум' : "so'm"}`

function slotText(order: Order, lang: 'ru' | 'uz'): string {
  if (!order.slot) return ''
  const days: Record<string, [string, string]> = {
    [todayKey()]: ['сегодня', 'bugun'],
    [addDays(todayKey(), 1)]: ['завтра', 'ertaga'],
    [addDays(todayKey(), 2)]: ['послезавтра', 'indinga'],
  }
  const day = days[order.slot.date]?.[lang === 'ru' ? 0 : 1] ?? formatDate(order.slot.date)
  return `${day}, ${String(order.slot.hour).padStart(2, '0')}:00`
}

/** Buyurtma holati o'zgarganda mijozga; xabar qilinmaydigan holatda — null. */
export function customerStatusMessage(db: Db, order: Order, lang: 'ru' | 'uz'): string | null {
  const number = `<b>${formatOrderNumber(order.number)}</b>`
  const total = money(orderTotals(order).total, lang)
  const phone = formatPhone(db.settings.phone)
  const slot = slotText(order, lang)
  const delivery = order.fulfillment === 'delivery'
  if (lang === 'ru') {
    switch (order.status) {
      case 'accepted':
        return `✅ Заказ ${number} принят. Мы начали его собирать.${slot ? `\n🕐 ${delivery ? 'Доставка' : 'Самовывоз'}: ${slot}` : ''}`
      case 'ready':
        return delivery
          ? `🎁 Заказ ${number} готов и скоро будет передан курьеру.\n💰 К оплате курьеру: ${total}`
          : `🎁 Заказ ${number} готов! Ждём вас в магазине${slot ? ` (${slot})` : ''}.\n📍 ${escapeHtml(db.settings.address)}\n💰 К оплате: ${total}`
      case 'done':
        return `💐 Заказ ${number} выдан. Спасибо за покупку! Будем рады видеть вас снова.`
      case 'cancelled':
        return `❌ Заказ ${number} отменён. Если это ошибка — позвоните нам: ${phone}`
      default:
        return null
    }
  }
  switch (order.status) {
    case 'accepted':
      return `✅ ${number} buyurtmangiz qabul qilindi. Tayyorlashni boshladik.${slot ? `\n🕐 ${delivery ? 'Yetkazish' : 'Olib ketish'}: ${slot}` : ''}`
    case 'ready':
      return delivery
        ? `🎁 ${number} buyurtmangiz tayyor, tez orada kuryerga beriladi.\n💰 Kuryerga to'lov: ${total}`
        : `🎁 ${number} buyurtmangiz tayyor! Do'konda kutamiz${slot ? ` (${slot})` : ''}.\n📍 ${escapeHtml(db.settings.address)}\n💰 To'lov: ${total}`
    case 'done':
      return `💐 ${number} buyurtmangiz topshirildi. Xaridingiz uchun rahmat! Yana kutib qolamiz.`
    case 'cancelled':
      return `❌ ${number} buyurtmangiz bekor qilindi. Xato bo'lsa, qo'ng'iroq qiling: ${phone}`
    default:
      return null
  }
}

/** Yangi bot buyurtmasi — xodimlar chatiga (shu qurilmadagi xodim tilida). */
export function staffNewOrderMessage(order: Order): string {
  const lines = order.lines
    .map((line) => `• ${escapeHtml(line.name)} — ${line.kind === 'gram' ? `${formatNumber(line.qty)} ${tr('g', 'г')}` : `${tr('original', 'оригинал')} × ${formatNumber(line.qty)}`}`)
    .join('\n')
  const lang = staffLang()
  const slot = slotText(order, lang)
  return [
    `🛍 <b>${tr('Yangi buyurtma', 'Новый заказ')} ${formatOrderNumber(order.number)}</b>`,
    `👤 ${escapeHtml(order.customerName)}${order.customerPhone ? `, ${formatPhone(order.customerPhone)}` : ''}`,
    `📦 ${FULFILLMENT_LABEL[order.fulfillment]}${slot ? ` · ${slot}` : ''}`,
    order.address ? `📍 ${escapeHtml(order.address)}` : '',
    lines,
    order.comment ? `💬 ${escapeHtml(order.comment)}` : '',
    `💰 ${money(orderTotals(order).total, lang)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
