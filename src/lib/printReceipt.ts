import { FULFILLMENT_LABEL, PAYMENT_LABEL, SOURCE_LABEL } from '@/domain/labels'
import { lineVolumeMl, orderTotals } from '@/domain/orders'
import type { Db, Order } from '@/domain/types'
import { tr } from '@/staff/i18n'
import { formatDateTime, formatNumber, formatOrderNumber, formatPhone } from './format'

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)

const money = (value: number) => formatNumber(value)

/** Chek eni va CSS px → mm (1 mm = 96 / 25.4 px). */
const PAPER_MM = 80
const PX_PER_MM = 96 / 25.4

/**
 * Chekdagi vaqt — sotilgan payt: "Berildi" hodisasi (kassa sotuvi shu zahoti, bot buyurtmasi mijozga berilganda).
 * Hali berilmagan buyurtma (tayyor bo'lgach oldindan chiqarilgan chek) uchun — hozirgi vaqt, mijoz buyurtma bergan
 * vaqt emas (u kecha yoki "Ertaga"ga berilgan bo'lishi mumkin).
 */
function soldAt(order: Order): string {
  for (let i = order.history.length - 1; i >= 0; i--) {
    if (order.history[i].status === 'done') return order.history[i].at
  }
  return new Date().toISOString()
}

/** 80 mm termochek (kassa sotuvi va bot buyurtmasi uchun bir xil). */
function receiptHtml(order: Order, db: Db): string {
  const { settings } = db
  const cashier = db.users.find((user) => user.id === order.cashierId)?.name
  const totals = orderTotals(order)

  const rows = order.lines
    .map((line) => {
      const ml = lineVolumeMl(db, line)
      const title = line.kind === 'bottle' ? `${line.name} — ${tr('original', 'оригинал')}${ml ? ` ${ml} ${tr('ml', 'мл')}` : ''}` : line.name
      const unit = line.kind === 'gram' ? tr('g', 'г') : tr('dona', 'шт.')
      const qty = `${money(line.qty)} ${unit} × ${money(line.unitPrice)}`
      let html = `<tr><td colspan="2" class="name">${escape(title)}</td></tr><tr><td class="muted">${qty}</td><td class="sum">${money(line.qty * line.unitPrice)}</td></tr>`
      if (line.flakon) {
        const flakon = db.flakons.find((item) => item.id === line.flakon?.flakonId)
        html += `<tr><td class="muted">+ ${escape(flakon?.name ?? tr('Flakon', 'Флакон'))}</td><td class="sum">${line.flakon.paid ? money(line.flakon.price) : tr('Tekin', 'Бесплатно')}</td></tr>`
      }
      return html
    })
    .join('')

  const customer = [order.customerName !== 'Mijoz' ? order.customerName : '', order.customerPhone ? formatPhone(order.customerPhone) : '']
    .filter(Boolean)
    .join(' · ')

  return `<!doctype html><html><head><meta charset="utf-8"><title>${formatOrderNumber(order.number)}</title><style>
@page { size: ${PAPER_MM}mm 297mm; margin: 0 }
* { box-sizing: border-box }
body { width: ${PAPER_MM}mm; margin: 0; padding: 4mm; font: 12px/1.35 'Courier New', monospace; color: #000 }
.center { text-align: center }
.brand { font-weight: 700; font-size: 18px; letter-spacing: .12em }
.number { font-size: 22px; font-weight: 900; margin: 2mm 0 1mm }
hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0 }
table { width: 100%; border-collapse: collapse }
td { vertical-align: top; padding: .4mm 0 }
.name { font-weight: 700; padding-top: 1.2mm }
.sum { text-align: right; white-space: nowrap; padding-left: 2mm }
.row { display: flex; justify-content: space-between; gap: 2mm }
.total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900 }
.muted { font-size: 11px }
.bold { font-weight: 700 }
</style></head><body>
<div class="center">
<div class="brand">${escape(settings.name.toUpperCase())}</div>
<div class="muted">${escape(settings.address)}</div>
<div class="muted">${escape(formatPhone(settings.phone))}</div>
<div class="number">${tr('Chek', 'Чек')} ${formatOrderNumber(order.number)}</div>
<div class="muted">${formatDateTime(soldAt(order))} · ${escape(SOURCE_LABEL[order.source])}</div>
</div>
<hr>
${cashier ? `<div class="row"><span>${tr('Kassir', 'Кассир')}</span><span>${escape(cashier)}</span></div>` : ''}
${customer ? `<div class="row"><span>${tr('Mijoz', 'Клиент')}</span><span>${escape(customer)}</span></div>` : ''}
${order.source === 'bot' ? `<div class="row"><span>${tr('Turi', 'Тип')}</span><span>${escape(FULFILLMENT_LABEL[order.fulfillment])}</span></div>` : ''}
${order.address ? `<div class="bold">${escape(order.address)}</div>` : ''}
<hr><table>${rows}</table><hr>
${totals.flakons > 0 ? `<div class="row"><span>${tr('Flakonlar', 'Флаконы')}</span><span>${money(totals.flakons)}</span></div>` : ''}
${totals.delivery > 0 ? `<div class="row"><span>${tr('Yetkazish', 'Доставка')}</span><span>${money(totals.delivery)}</span></div>` : ''}
<div class="total"><span>${tr('JAMI', 'ИТОГО')}</span><span>${money(totals.total)} ${tr("so'm", 'сум')}</span></div>
<div class="row muted"><span>${tr("To'lov", 'Оплата')}</span><span>${order.payment ? escape(PAYMENT_LABEL[order.payment]) : tr("To'lanmagan", 'Не оплачено')}</span></div>
<hr>
<div class="center muted">${escape(settings.receiptFooter)}</div>
</body></html>`
}

/**
 * Chekni yashirin oynada chop etadi (brauzerning standart printeri — kassadagi 80 mm termoprinter). Chrome
 * `--kiosk-printing` bilan ochilsa, oyna so'ramasdan darhol chiqadi.
 *
 * Sahifa o'lchami: eni 80 mm, bo'yi — chek matnining haqiqiy balandligi (o'lchab qo'yiladi), shunda printer A4 /
 * Letter varag'ini emas, faqat chek uzunligini chiqaradi. `size: 80mm auto` CSS da noto'g'ri — brauzer uni tashlab
 * yuboradi, shuning uchun HTML da zaxira 80×297 mm turadi.
 */
export function printReceipt(order: Order, db: Db): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.srcdoc = receiptHtml(order, db)
  frame.onload = () => {
    const doc = frame.contentDocument
    if (doc) {
      const heightMm = Math.ceil(doc.body.scrollHeight / PX_PER_MM) + 2
      const style = doc.createElement('style')
      style.textContent = `@page { size: ${PAPER_MM}mm ${heightMm}mm; margin: 0 }`
      doc.head.appendChild(style)
    }
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    // print() oyna yopilguncha kutadi; keyin iframe kerak emas
    window.setTimeout(() => frame.remove(), 1000)
  }
  document.body.appendChild(frame)
}
