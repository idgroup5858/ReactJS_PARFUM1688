import { Plus, RotateCcw, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { http } from '@/api/http'
import { useDemoInfo } from '@/app/demo'
import { confirmDanger, showErrors } from '@/components/admin/confirm'
import NumberInput from '@/components/admin/NumberInput'
import { Card, CardHeader } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { buttonClass, inputClass, textareaClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import type { ShopSettings } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import { setAccent, useSettings } from '@/store/settingsStore'
import { findAccent } from '@/theme/accents'
import TelegramIntegration from '../integrations/TelegramIntegration'
import AccentPalette from './settings/AccentPalette'
import CustomerAppearanceCard from './settings/CustomerAppearanceCard'
import ThemeCard from './settings/ThemeCard'

/** Faqat yuborilgan maydonlar o'zgaradi (`PATCH /api/settings`); mijoz ilovalari katalogni qayta oladi. */
async function saveSettings(patch: Partial<ShopSettings>): Promise<boolean> {
  if ((await commit(() => http.patch('/settings', patch))) === null) return false
  showToast(tr('Saqlandi', 'Сохранено'))
  return true
}

/**
 * Do'kon telefoni "+998XXXXXXXXX" ko'rinishida saqlanadi: mijoz ilovasi undan `tel:` havola yasaydi, chek va ilova
 * formatPhone bilan chiroyli ko'rsatadi. 9 raqam (operator kodi bilan) kiritilsa, +998 o'zi qo'shiladi.
 * Noto'g'ri raqam bo'lsa `null`.
 */
function normalizeShopPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  const full = digits.length === 9 ? `998${digits}` : digits
  return /^998\d{9}$/.test(full) ? `+${full}` : null
}

/** Do'kon ma'lumotlari (chekda ham chiqadi). */
function ShopCard({ settings }: { settings: ShopSettings }) {
  const [draft, setDraft] = useState({ name: settings.name, phone: settings.phone, address: settings.address, receiptFooter: settings.receiptFooter })
  const dirty = JSON.stringify(draft) !== JSON.stringify({ name: settings.name, phone: settings.phone, address: settings.address, receiptFooter: settings.receiptFooter })

  const save = () => {
    const errors: string[] = []
    const phone = normalizeShopPhone(draft.phone)
    if (!draft.name.trim()) errors.push(tr("Do'kon nomini kiriting", 'Введите название магазина'))
    if (!phone) errors.push(tr("Telefon raqamini to'liq kiriting: +998 90 123 45 67", 'Введите номер телефона полностью: +998 90 123 45 67'))
    if (errors.length || !phone) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const next = { name: draft.name.trim(), phone, address: draft.address.trim(), receiptFooter: draft.receiptFooter.trim() }
    // forma saqlangan (tozalangan) qiymatlarni ko'rsatsin — raqam bazadagi bilan bir xil chiqsa, karta qayta yaratilmaydi
    setDraft(next)
    void saveSettings(next)
  }

  return (
    <Card>
      <CardHeader title={tr("Do'kon ma'lumotlari", 'Данные магазина')} hint={tr("Chek va mijoz ilovasida ko'rinadi", 'Видны в чеке и в приложении клиента')} />
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label={tr('Nomi', 'Название')} htmlFor="shop-name">
          <input id="shop-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} />
        </Field>
        <Field
          label={tr('Telefon', 'Телефон')}
          htmlFor="shop-phone"
          hint={tr("Mijoz ilovasidagi «Позвонить» shu raqamga qo'ng'iroq qiladi", 'Кнопка «Позвонить» в приложении клиента звонит на этот номер')}
        >
          <input
            id="shop-phone"
            type="tel"
            inputMode="tel"
            value={draft.phone}
            placeholder="+998 90 123 45 67"
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field label={tr('Manzil', 'Адрес')} htmlFor="shop-address" className="sm:col-span-2">
          <input id="shop-address" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className={inputClass} />
        </Field>
        <Field label={tr('Chek ostidagi matn', 'Текст внизу чека')} htmlFor="shop-footer" className="sm:col-span-2">
          <textarea
            id="shop-footer"
            rows={2}
            value={draft.receiptFooter}
            onChange={(event) => setDraft({ ...draft, receiptFooter: event.target.value })}
            className={textareaClass}
          />
        </Field>
      </div>
      <div className="flex justify-end border-t border-neutral-200 px-4 py-3">
        <button type="button" disabled={!dirty} onClick={save} className={`btn-primary ${buttonClass} h-9`}>
          <Save size={15} />
          {tr('Saqlash', 'Сохранить')}
        </button>
      </div>
    </Card>
  )
}

/** Razliv qoidalari va kam qoldiq chegaralari. */
function RulesCard({ settings }: { settings: ShopSettings }) {
  const [minGrams, setMinGrams] = useState(settings.minGrams)
  const [chips, setChips] = useState(settings.gramChips)
  const [newChip, setNewChip] = useState(0)
  const [lowStockGrams, setLowStockGrams] = useState(settings.lowStockGrams)
  const [lowStockPieces, setLowStockPieces] = useState(settings.lowStockPieces)
  const dirty =
    minGrams !== settings.minGrams ||
    lowStockGrams !== settings.lowStockGrams ||
    lowStockPieces !== settings.lowStockPieces ||
    JSON.stringify(chips) !== JSON.stringify(settings.gramChips)

  const addChip = () => {
    if (newChip <= 0 || chips.includes(newChip)) return
    setChips([...chips, newChip].sort((a, b) => a - b))
    setNewChip(0)
  }

  const save = () => {
    const errors: string[] = []
    if (minGrams <= 0) errors.push(tr("Eng kam hajm 0 dan katta bo'lsin", 'Минимальный объём должен быть больше 0'))
    if (chips.length === 0) errors.push(tr('Kamida bitta hajm tugmasi kerak', 'Нужна хотя бы одна кнопка объёма'))
    if (chips.some((chip) => chip < minGrams)) {
      errors.push(
        tr(
          `Hajm tugmalari eng kam hajmdan (${minGrams} g) kichik bo'lmasin`,
          `Кнопки объёма не должны быть меньше минимального объёма (${minGrams} г)`,
        ),
      )
    }
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    void saveSettings({ minGrams, gramChips: chips, lowStockGrams, lowStockPieces })
  }

  return (
    <Card>
      <CardHeader title={tr('Savdo qoidalari', 'Правила продажи')} hint={tr('Barcha atirlar uchun bitta qoida', 'Одно правило для всех ароматов')} />
      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={tr('Eng kam razliv hajmi', 'Минимальный объём розлива')}
            htmlFor="rule-min"
            hint={tr('Mijoz bundan kam buyurtma bera olmaydi', 'Клиент не сможет заказать меньше')}
          >
            <NumberInput id="rule-min" value={minGrams} onChange={setMinGrams} suffix={tr('g', 'г')} />
          </Field>
          <Field
            label={tr('Kam qoldiq: razliv', 'Мало остатка: розлив')}
            htmlFor="rule-low-grams"
            hint={tr("Shundan kam bo'lsa ogohlantirish", 'Предупреждать, если меньше')}
          >
            <NumberInput id="rule-low-grams" value={lowStockGrams} onChange={setLowStockGrams} suffix={tr('g', 'г')} />
          </Field>
          <Field label={tr('Kam qoldiq: dona', 'Мало остатка: штуки')} htmlFor="rule-low-pieces" hint={tr('Original flakon va taralar', 'Оригинальные флаконы и тара')}>
            <NumberInput id="rule-low-pieces" value={lowStockPieces} onChange={setLowStockPieces} suffix={tr('dona', 'шт.')} />
          </Field>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-600">{tr('Hajm tanlash tugmalari', 'Кнопки выбора объёма')}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="inline-flex h-9 items-center gap-1 rounded border border-neutral-300 bg-white pr-1 pl-3 text-sm font-semibold tabular-nums">
                {formatNumber(chip)} {tr('g', 'г')}
                <button
                  type="button"
                  aria-label={tr(`${chip} g ni olib tashlash`, `Убрать ${chip} г`)}
                  title={tr('Olib tashlash', 'Убрать')}
                  onClick={() => setChips(chips.filter((item) => item !== chip))}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-28">
                <NumberInput value={newChip} onChange={setNewChip} suffix={tr('g', 'г')} placeholder={tr('Hajm', 'Объём')} />
              </div>
              <button type="button" onClick={addChip} disabled={newChip <= 0 || chips.includes(newChip)} className={`btn-outline ${buttonClass} h-10 px-3`}>
                <Plus size={15} />
                {tr("Qo'shish", 'Добавить')}
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {tr('Mijoz ilovasidagi «Минимальный объём» oynasida shu tugmalar chiqadi', 'Эти кнопки показываются в окне «Минимальный объём» в приложении клиента')}
          </p>
        </div>
      </div>
      <div className="flex justify-end border-t border-neutral-200 px-4 py-3">
        <button type="button" disabled={!dirty} onClick={save} className={`btn-primary ${buttonClass} h-9`}>
          <Save size={15} />
          {tr('Saqlash', 'Сохранить')}
        </button>
      </div>
    </Card>
  )
}

type SettingsTab = 'general' | 'integrations'

/**
 * Admin → Sozlamalar. Tablar (manzilda `?tab=`): Umumiy — mijoz ilovasi rangi (jonli ko'rinish bilan), shu qurilmadagi
 * kassa / admin ko'rinishi, do'kon ma'lumotlari, savdo qoidalari, demo ma'lumotlar; Integratsiya — Telegram bot.
 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: SettingsTab = params.get('tab') === 'integrations' ? 'integrations' : 'general'
  useDocumentTitle(tab === 'integrations' ? tr('Integratsiya', 'Интеграция') : tr('Sozlamalar', 'Настройки'))

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Sozlamalar', 'Настройки')}
        description={
          tab === 'integrations'
            ? tr('Telegram bot: ulash, obunachilar, xabarlar, rassilka', 'Telegram-бот: подключение, подписчики, сообщения, рассылка')
            : tr("O'zgarishlar darhol qo'llanadi", 'Изменения применяются сразу')
        }
        actions={
          <SegmentedControl<SettingsTab>
            label={tr("Sozlamalar bo'limi", 'Раздел настроек')}
            value={tab}
            onChange={(next) => setParams(next === 'general' ? {} : { tab: next }, { replace: true })}
            options={[
              { value: 'general', label: tr('Umumiy', 'Общие') },
              { value: 'integrations', label: tr('Integratsiya', 'Интеграция') },
            ]}
          />
        }
      />
      {tab === 'integrations' ? <TelegramIntegration /> : <GeneralSettings />}
    </div>
  )
}

function GeneralSettings() {
  const db = useDb()
  const { accentId } = useSettings()
  const { demo } = useDemoInfo()

  const reset = async () => {
    const confirmed = await confirmDanger(
      tr("Demo ma'lumotlarni tiklash", 'Сброс демо-данных'),
      tr(
        "Barcha atirlar, buyurtmalar, ombor, moliya yozuvlari va xodimlar boshlang'ich demo holatiga qaytadi. Kiritilgan o'zgarishlar yo'qoladi.",
        'Все ароматы, заказы, склад, финансовые записи и сотрудники вернутся к исходным демо-данным. Внесённые изменения будут потеряны.',
      ),
      tr('Tiklash', 'Сбросить'),
    )
    if (!confirmed) return
    if ((await commit(() => http.post('/demo/reset'))) === null) return
    showToast(tr("Demo ma'lumotlar tiklandi", 'Демо-данные восстановлены'))
  }

  const products = db.products.length
  const orders = db.orders.length
  const purchases = db.purchases.length

  return (
    <div className="space-y-4">
      <CustomerAppearanceCard accentId={db.settings.customerAccentId} onChange={(customerAccentId) => void saveSettings({ customerAccentId })} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ThemeCard />
        <Card>
          <CardHeader
            title={tr('Kassa va admin rangi', 'Цвет кассы и админки')}
            hint={tr("Faqat shu qurilmada · mijozlarga ta'sir qilmaydi", 'Только на этом устройстве · не влияет на клиентов')}
            actions={<span className="text-xs font-semibold text-brand-700">{tr(findAccent(accentId).name, findAccent(accentId).nameRu)}</span>}
          />
          <AccentPalette value={accentId} onChange={setAccent} label={tr('Kassa va admin rangi', 'Цвет кассы и админки')} />
        </Card>
      </div>

      {/* key — boshqa ekranda o'zgartirilsa yoki demo tiklanganda formalar yangi qiymatlardan qayta to'ldiriladi */}
      <ShopCard key={`shop-${JSON.stringify([db.settings.name, db.settings.phone, db.settings.address, db.settings.receiptFooter])}`} settings={db.settings} />
      <RulesCard
        key={`rules-${JSON.stringify([db.settings.minGrams, db.settings.gramChips, db.settings.lowStockGrams, db.settings.lowStockPieces])}`}
        settings={db.settings}
      />

      {/* faqat demo serverda (`DEMO=1`) — haqiqiy do'konda bazani bir tugma bilan o'chirib bo'lmasin */}
      {demo && (
        <Card>
          <CardHeader
            title={tr("Demo ma'lumotlar", 'Демо-данные')}
            hint={tr("Sinov uchun: bazani boshlang'ich holatga qaytarish", 'Для тестов: вернуть базу в исходное состояние')}
          />
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-600">
              {tr(
                `Hozir serverda: ${formatNumber(products)} ta atir, ${formatNumber(orders)} ta buyurtma, ${formatNumber(purchases)} ta prixod.`,
                `Сейчас на сервере: ${formatNumber(products)} ${ruPlural(products, 'аромат', 'аромата', 'ароматов')}, ${formatNumber(orders)} ${ruPlural(orders, 'заказ', 'заказа', 'заказов')}, ${formatNumber(purchases)} ${ruPlural(purchases, 'приход', 'прихода', 'приходов')}.`,
              )}
            </p>
            <button type="button" onClick={() => void reset()} className={`btn-ghost ${buttonClass} shrink-0 text-red-700!`}>
              <RotateCcw size={15} />
              {tr("Demo ma'lumotlarni tiklash", 'Сбросить демо-данные')}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
