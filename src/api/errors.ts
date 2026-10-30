import type { Lang } from '@/domain/types'
import { staffLang } from '@/staff/i18n'
import { ApiError } from './http'

/** Backend xato kodlari (NestJS_PARFUM1688 `src/common/errors.ts`) va ularning matni — o'zbekcha / ruscha. */
const TEXTS = {
  not_found: ['Topilmadi', 'Не найдено'],
  unauthorized: ['Avval tizimga kiring', 'Сначала войдите в систему'],
  forbidden: ['Bu amal sizning rolingiz uchun emas', 'Это действие недоступно для вашей роли'],
  invalid_input: ["Ma'lumotlar noto'g'ri", 'Неверные данные'],
  too_many_attempts: ["Ko'p marta urinildi — birozdan keyin qayta urinib ko'ring", 'Слишком много попыток — попробуйте чуть позже'],
  wrong_pin: ["PIN noto'g'ri", 'Неверный PIN'],
  invalid_pin: ["PIN 4–8 ta raqamdan iborat bo'lsin", 'PIN должен состоять из 4–8 цифр'],
  pin_taken: ['Bu PIN boshqa xodimda bor — boshqasini tanlang', 'Этот PIN уже у другого сотрудника — выберите другой'],
  last_admin: ['Kamida bitta faol admin qolishi kerak', 'Должен остаться хотя бы один активный админ'],
  self_action: [
    "O'zingizni o'chira, nofaol qila yoki admin rolidan olib tashlay olmaysiz",
    'Нельзя удалить себя, сделать неактивным или снять с себя роль админа',
  ],
  user_has_history: [
    "Xodim buyurtma va hujjatlarda qayd etilgan — o'chirish o'rniga nofaol qiling",
    'Сотрудник указан в заказах и документах — вместо удаления сделайте его неактивным',
  ],
  name_required: ['Nomini kiriting', 'Введите название'],
  name_taken: ['Bunday nom allaqachon bor', 'Такое название уже есть'],
  in_use: ["Ishlatilmoqda — o'chirib bo'lmaydi", 'Используется — удалить нельзя'],
  group_locked: ["Kategoriyada atirlar bor — turini o'zgartirib bo'lmaydi", 'В категории есть ароматы — тип изменить нельзя'],
  image_required: ['Rasm tanlang', 'Выберите изображение'],
  family_required: ['Kamida bitta aromat oilasini tanlang', 'Выберите хотя бы одно семейство ароматов'],
  invalid_price: ["Narx noto'g'ri", 'Неверная цена'],
  description_required: ['Tavsifni ikkala tilda yozing', 'Заполните описание на обоих языках'],
  invalid_image: [
    "Rasm JPG, PNG, WEBP yoki AVIF bo'lishi va 5 MB dan oshmasligi kerak",
    'Изображение должно быть JPG, PNG, WEBP или AVIF и не больше 5 МБ',
  ],
  invalid_qty: ["Miqdor noto'g'ri", 'Неверное количество'],
  invalid_amount: ["Summa noto'g'ri", 'Неверная сумма'],
  duplicate_line: ['Bir pozitsiya ikki marta kiritilgan', 'Одна позиция указана дважды'],
  unknown_stock_item: ['Ombor pozitsiyasi topilmadi', 'Складская позиция не найдена'],
  future_date: ["Sana kelajakda bo'lmasin", 'Дата не может быть в будущем'],
  overpaid: ["To'lov summadan ko'p bo'lmasin", 'Оплата не может превышать сумму'],
  empty_lines: ['Kamida bitta pozitsiya va miqdor kiriting', 'Добавьте хотя бы одну позицию с количеством'],
  empty_order: ["Savat bo'sh", 'Корзина пуста'],
  product_unavailable: ["Atir sotuvda yo'q", 'Аромата нет в продаже'],
  flakon_unavailable: ['Flakon topilmadi', 'Флакон не найден'],
  invalid_slot: ['Tanlangan kun yoki soat mavjud emas', 'Выбранный день или время недоступны'],
  phone_invalid: ["Telefon raqam noto'g'ri", 'Неверный номер телефона'],
  address_required: ['Yetkazib berish manzilini kiriting', 'Укажите адрес доставки'],
  invalid_status: ["Buyurtmani bu holatga o'tkazib bo'lmaydi", 'Заказ нельзя перевести в этот статус'],
  order_finished: ['Buyurtma yopilgan (berilgan yoki bekor qilingan)', 'Заказ закрыт (выдан или отменён)'],
  payment_required: ["To'lov turini tanlang", 'Выберите способ оплаты'],
  lines_locked: [
    "Tovar ombordan chiqarilgan — qatorlarni o'zgartirib bo'lmaydi",
    'Товар уже списан со склада — строки менять нельзя',
  ],
  invalid_init_data: [
    "Telegram ma'lumoti tasdiqlanmadi — ilovani bot orqali qayta oching",
    'Не удалось подтвердить данные Telegram — откройте приложение через бота заново',
  ],
  review_not_allowed: ['Sharhni faqat shu atirni xarid qilgan mijoz yoza oladi', 'Отзыв может оставить только купивший этот аромат'],
  already_reviewed: ['Bu atirga sharh yozgansiz', 'Вы уже оставили отзыв об этом аромате'],
  telegram_token_invalid: [
    "Bot tokeni noto'g'ri — @BotFather bergan tokenni to'liq nusxalang",
    'Неверный токен бота — скопируйте токен от @BotFather полностью',
  ],
  telegram_unreachable: ["Telegram serveriga ulanib bo'lmadi — internetni tekshiring", 'Не удалось связаться с Telegram — проверьте интернет'],
  telegram_not_connected: ['Avval bot tokenini kiriting', 'Сначала укажите токен бота'],
  telegram_error: ['Telegram xato qaytardi', 'Telegram вернул ошибку'],
  broadcast_running: ["Rassilka davom etmoqda — tugashini kuting yoki to'xtating", 'Рассылка ещё идёт — дождитесь окончания или остановите'],
  no_recipients: ["Qabul qiluvchilar yo'q", 'Нет получателей'],
  demo_disabled: ["Demo rejimi o'chiq", 'Демо-режим выключен'],
  network: ["Serverga ulanib bo'lmadi — internet yoki serverni tekshiring", 'Нет связи с сервером — проверьте интернет или сервер'],
  unknown: ['Serverda xatolik yuz berdi', 'Ошибка на сервере'],
} satisfies Record<string, readonly [uz: string, ru: string]>

export type ErrorCode = Exclude<keyof typeof TEXTS, 'network' | 'unknown'>

/** Xato matni [lang] da (standart — xodim tili). Telegram xatosida sababi (`detail`) ham qo'shiladi. */
export function errorText(error: unknown, lang: Lang = staffLang()): string {
  const index = lang === 'ru' ? 1 : 0
  if (!(error instanceof ApiError)) return TEXTS.unknown[index]
  const text = (TEXTS as Record<string, readonly [string, string]>)[error.code]?.[index] ?? error.message
  return error.code === 'telegram_error' && error.detail ? `${text}: ${error.detail}` : text
}

/** Shu kodli xatomi (masalan `isApiError(error, 'in_use')` — maxsus oyna ko'rsatish uchun). */
export function isApiError(error: unknown, code: ApiError['code']): error is ApiError {
  return error instanceof ApiError && error.code === code
}
