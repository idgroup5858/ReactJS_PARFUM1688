import { bilingual } from '@/staff/i18n'
import type {
  CategoryGroup,
  Fulfillment,
  MovementReason,
  OrderSource,
  OrderStatus,
  PaymentType,
  Role,
  StockKind,
  WriteOffReason,
} from './types'

/** Kassa va admin yorliqlari — xodim tilida (o'zbek / rus). Mijoz ilovasi o'z tarjimalarini ishlatadi (customer/i18n.ts). */

export const ORDER_STATUS_LABEL = bilingual<OrderStatus>({
  new: ['Yangi', 'Новый'],
  accepted: ['Qabul qilindi', 'Принят'],
  preparing: ['Tayyorlanmoqda', 'Готовится'],
  ready: ['Tayyor', 'Готов'],
  done: ['Berildi', 'Выдан'],
  cancelled: ['Bekor qilindi', 'Отменён'],
})

/** Holat belgisi ranglari (fon + matn + chegara) */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  accepted: 'bg-brand-50 text-brand-700 border-brand-200',
  preparing: 'bg-amber-50 text-amber-700 border-amber-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  done: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export const PAYMENT_TYPES: PaymentType[] = ['cash', 'card', 'click', 'payme']

export const PAYMENT_LABEL = bilingual<PaymentType>({
  cash: ['Naqd', 'Наличные'],
  card: ['Karta', 'Карта'],
  click: ['Click', 'Click'],
  payme: ['Payme', 'Payme'],
})

export const FULFILLMENT_LABEL = bilingual<Fulfillment>({
  pickup: ['Olib ketish', 'Самовывоз'],
  delivery: ['Yetkazib berish', 'Доставка'],
})

export const SOURCE_LABEL = bilingual<OrderSource>({
  bot: ['Telegram bot', 'Telegram-бот'],
  pos: ['Kassa', 'Касса'],
})

export const MOVEMENT_REASON_LABEL = bilingual<MovementReason>({
  initial: ["Boshlang'ich qoldiq", 'Начальный остаток'],
  purchase: ['Prixod', 'Приход'],
  sale: ['Sotuv', 'Продажа'],
  return: ['Qaytarildi', 'Возврат'],
  writeoff: ['Spisanie', 'Списание'],
  inventory: ['Inventarizatsiya', 'Инвентаризация'],
})

export const WRITEOFF_REASONS: WriteOffReason[] = ['spill', 'damage', 'tester', 'expired', 'other']

export const WRITEOFF_REASON_LABEL = bilingual<WriteOffReason>({
  spill: ["To'kilgan", 'Пролито'],
  damage: ['Singan / buzilgan', 'Разбито / испорчено'],
  tester: ['Tester', 'Тестер'],
  expired: ["Muddati o'tgan", 'Истёк срок'],
  other: ['Boshqa', 'Другое'],
})

export const ROLE_LABEL = bilingual<Role>({
  admin: ['Admin', 'Админ'],
  cashier: ['Kassir', 'Кассир'],
})

export const CATEGORY_GROUP_LABEL = bilingual<CategoryGroup>({
  family: ['Aromat oilasi', 'Семейство ароматов'],
  class: ['Sinf', 'Класс'],
})

export const STOCK_KIND_LABEL = bilingual<StockKind>({
  gram: ['Razliv (gramm)', 'Розлив (граммы)'],
  bottle: ['Original flakon', 'Оригинальный флакон'],
  flakon: ['Tara (flakon)', 'Тара (флакон)'],
})
