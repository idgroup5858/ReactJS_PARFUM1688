/**
 * PARFUM1688 ma'lumotlar modeli — backend (NestJS_PARFUM1688, `GET /api/snapshot`) bilan bir xil shartnoma.
 * Pul — butun so'm (UZS), vaqt — ISO satr, sana — "YYYY-MM-DD". Ixtiyoriy maydonlar serverdan `null` bo'lib keladi —
 * data/db.ts ularni olib tashlaydi (`undefined`), faqat `Product.bottle` `null` bo'lib qoladi.
 */

export type ID = string

/** Mijoz ilovasi tillari; kassa va admin faqat o'zbekcha. */
export type Lang = 'ru' | 'uz'
export type Localized = Record<Lang, string>

/** Rasm yo'li serverdagi rasmlar papkasi ichida: "perfumes/lv-symphony.png" (images/index.ts → imageUrl). */
export type ImagePath = string

// ───────────────────────── Katalog ─────────────────────────

export interface Brand {
  id: ID
  name: string
  country?: string
}

/**
 * `family` — aromat oilasi (Цветочные, Древесные...; bosh sahifadagi rasmli kategoriyalar),
 * `class` — sifat sinfi (PREMIUM, TOP...; atir nomi yonida ko'rsatiladi).
 */
export type CategoryGroup = 'family' | 'class'

export interface Category {
  id: ID
  name: Localized
  image: ImagePath
  group: CategoryGroup
  sort: number
}

/** Nota (Bergamot, Atirgul, Vanil...) — rasmi bilan bir marta kiritiladi, atirlarda ro'yxatdan tanlanadi. */
export interface Note {
  id: ID
  name: Localized
  image: ImagePath
}

/** Asosiy akkord (Цитрусовый, Древесный...) — mahsulot sahifasidagi rangli chiziq. */
export interface Accord {
  id: ID
  name: Localized
  /** chiziq foni, matn rangi yorqinligiga qarab avtomatik (oq / qora) */
  color: string
}

export type Gender = 'female' | 'male' | 'unisex'

/** "Когда носить" — admin bitta asosiy qiymat tanlaydi, chiziqlar domain/presets.ts dan. */
export type SeasonPreset = 'summer' | 'spring' | 'autumn' | 'winter' | 'universal' | 'evening'
export type LongevityLevel = 'very_weak' | 'weak' | 'moderate' | 'long' | 'eternal'
export type SillageLevel = 'intimate' | 'moderate' | 'strong' | 'enormous'

export interface Product {
  id: ID
  /** "Louis Vuitton Symphony" — ikkala tilda bir xil */
  name: string
  brandId: ID
  /** family va class kategoriyalari aralash */
  categoryIds: ID[]
  gender: Gender
  image: ImagePath
  description: Localized
  notes: { top: ID[]; middle: ID[]; base: ID[] }
  /** kuchlisidan boshlab tartiblangan akkordlar (chiziq uzunligi tartibdan) */
  accords: ID[]
  season: SeasonPreset
  longevity: LongevityLevel
  sillage: SillageLevel
  /** quyib sotish (razliv) narxi, 1 gramm uchun */
  pricePerGram: number
  /** original flakon (dona) sotiladimi; `null` — faqat razliv */
  bottle: { volumeMl: number; price: number } | null
  isNew: boolean
  active: boolean
  createdAt: string
}

/** Bo'sh idish (tara): quyilgan atir shunga solinadi. Kassir tanlaydi, tekin yoki pullik bo'lishi mumkin. */
export interface Flakon {
  id: ID
  name: string
  volumeMl: number
  /** pullik berilganda sotuv narxi */
  price: number
  image: ImagePath
  active: boolean
}

// ───────────────────────── Ombor ─────────────────────────

/**
 * Ombordagi har bir pozitsiya kaliti (domain/stock.ts → stockKey):
 * `gram:<productId>` — razliv atir, grammda; `bottle:<productId>` — original flakon, dona; `flakon:<flakonId>` — tara, dona.
 */
export type StockKind = 'gram' | 'bottle' | 'flakon'
export type StockKey = `${StockKind}:${string}`

export interface StockBalance {
  qty: number
  /** o'rtacha tannarx, 1 birlik (gramm yoki dona) uchun — kirimda qayta hisoblanadi */
  avgCost: number
}

export type MovementReason = 'initial' | 'purchase' | 'sale' | 'return' | 'writeoff' | 'inventory'

export interface StockMovement {
  id: ID
  at: string
  key: StockKey
  /** + kirim, − chiqim */
  qty: number
  unitCost: number
  reason: MovementReason
  /** buyurtma / prixod / spisanie / inventarizatsiya id si */
  refId?: ID
  userId?: ID
  /**
   * chiqim paytida tannarx noma'lum edi (pozitsiya hali kirim qilinmagan) — keyingi prixod narxi shu harakatga va
   * hujjatiga yoziladi (domain/stock.ts → stockIn)
   */
  costPending?: boolean
}

export interface Supplier {
  id: ID
  name: string
  phone: string
  note?: string
  createdAt: string
}

export interface PurchaseLine {
  key: StockKey
  qty: number
  /** 1 birlik kirim narxi */
  unitCost: number
}

/** Prixod (kirim): yetkazib beruvchidan tovar. To'lanmagan qismi qarzga yoziladi. */
export interface Purchase {
  id: ID
  number: number
  date: string
  supplierId: ID
  lines: PurchaseLine[]
  total: number
  note?: string
  userId: ID
  createdAt: string
}

/** Yetkazib beruvchiga to'lov. Qarz = Σ prixod − Σ to'lov (prixod paytidagi to'lov ham shu yerda, purchaseId bilan). */
export interface SupplierPayment {
  id: ID
  date: string
  supplierId: ID
  amount: number
  purchaseId?: ID
  note?: string
  userId: ID
  createdAt: string
}

export interface InventoryLine {
  key: StockKey
  expected: number
  actual: number
  unitCost: number
}

/** Inventarizatsiya: sanalgan qoldiq bilan tizimdagi farq harakat sifatida yoziladi. */
export interface InventoryCount {
  id: ID
  number: number
  date: string
  lines: InventoryLine[]
  note?: string
  userId: ID
  createdAt: string
}

export type WriteOffReason = 'spill' | 'damage' | 'tester' | 'expired' | 'other'

export interface WriteOffLine {
  key: StockKey
  qty: number
  unitCost: number
}

/** Spisanie: to'kilgan, singan, tester va h.k. */
export interface WriteOff {
  id: ID
  number: number
  date: string
  reason: WriteOffReason
  lines: WriteOffLine[]
  note?: string
  userId: ID
  createdAt: string
}

// ───────────────────────── Moliya ─────────────────────────

export type PaymentType = 'cash' | 'card' | 'click' | 'payme'

export interface ExpenseCategory {
  id: ID
  name: string
}

export interface Expense {
  id: ID
  date: string
  categoryId: ID
  amount: number
  payment: PaymentType
  note?: string
  userId: ID
  createdAt: string
}

// ───────────────────────── Savdo ─────────────────────────

export interface Customer {
  id: ID
  name: string
  phone: string
  telegramId?: number
  createdAt: string
}

export type OrderSource = 'bot' | 'pos'
export type Fulfillment = 'pickup' | 'delivery'
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'done' | 'cancelled'

export interface OrderLine {
  id: ID
  productId: ID
  /** gram — razliv (qty grammda), bottle — original flakon (qty donada) */
  kind: 'gram' | 'bottle'
  /** buyurtma paytidagi nom */
  name: string
  /**
   * faqat original qatorida: buyurtma paytidagi flakon hajmi, ml (createOrder yozadi) — keyin atirda original
   * o'chirilsa yoki hajmi o'zgarsa ham chek va buyurtma to'g'ri ko'rsatadi
   */
  volumeMl?: number
  qty: number
  /** 1 gramm yoki 1 dona narxi */
  unitPrice: number
  /** ombordan chiqarilgandagi tannarx (1 birlik) — foyda hisobi uchun */
  unitCost?: number
  /** faqat razliv qatorida: kassir tanlagan tara */
  flakon?: { flakonId: ID; paid: boolean; price: number; unitCost?: number }
}

export interface OrderEvent {
  status: OrderStatus
  at: string
  userId?: ID
}

export interface Order {
  id: ID
  number: number
  source: OrderSource
  createdAt: string
  customerId?: ID
  customerName: string
  customerPhone: string
  fulfillment: Fulfillment
  address?: string
  /** bot buyurtmasi: mijoz tanlagan kun va soat */
  slot?: { date: string; hour: number }
  comment?: string
  lines: OrderLine[]
  /** yetkazish narxi — kassir mijoz bilan telefonda kelishib kiritadi */
  deliveryFee: number
  status: OrderStatus
  payment?: PaymentType
  cashierId?: ID
  history: OrderEvent[]
  /** atir va taralar ombordan chiqarilganmi ("Tayyor" bosilganda) */
  stockApplied: boolean
}

export interface Review {
  id: ID
  productId: ID
  customerId: ID
  name: string
  rating: number
  text: string
  createdAt: string
  hidden: boolean
}

export interface Banner {
  id: ID
  title: Localized
  subtitle: Localized
  button: Localized
  /** tugma bosilganda: "/catalog?new=1", "/product/<id>" ... */
  link: string
  image: ImagePath
  active: boolean
  sort: number
}

// ───────────────────────── Tizim ─────────────────────────

export type Role = 'admin' | 'cashier'

/** PIN serverda faqat xesh bo'lib saqlanadi — ro'yxatda yo'q, admin faqat yangisini qo'yadi. */
export interface User {
  id: ID
  name: string
  role: Role
  active: boolean
  createdAt: string
}

export interface ShopSettings {
  name: string
  phone: string
  address: string
  /** mijoz ilovasi rangi (theme/accents.ts) */
  customerAccentId: string
  /** razliv: eng kam buyurtma, gramm */
  minGrams: number
  /** hajm tanlash tugmalari, gramm */
  gramChips: number[]
  /** shundan kam qolsa ogohlantirish */
  lowStockGrams: number
  lowStockPieces: number
  receiptFooter: string
}

export interface Counters {
  order: number
  purchase: number
  inventory: number
  writeOff: number
}

export interface Db {
  settings: ShopSettings
  users: User[]
  brands: Brand[]
  categories: Category[]
  notes: Note[]
  accords: Accord[]
  products: Product[]
  flakons: Flakon[]
  stock: Record<StockKey, StockBalance>
  movements: StockMovement[]
  suppliers: Supplier[]
  purchases: Purchase[]
  supplierPayments: SupplierPayment[]
  inventories: InventoryCount[]
  writeOffs: WriteOff[]
  expenseCategories: ExpenseCategory[]
  expenses: Expense[]
  customers: Customer[]
  orders: Order[]
  reviews: Review[]
  banners: Banner[]
  counters: Counters
}
