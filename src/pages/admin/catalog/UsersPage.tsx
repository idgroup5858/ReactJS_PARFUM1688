import { KeyRound, Pencil, Plus, Trash, UserCog } from 'lucide-react'
import { useState } from 'react'
import { http } from '@/api/http'
import { useCurrentUser } from '@/app/session'
import Badge from '@/components/admin/Badge'
import { confirmDanger, explainBlocked, showErrors } from '@/components/admin/confirm'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass, tdClass, thClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import { ROLE_LABEL } from '@/domain/labels'
import type { Db, Role, User } from '@/domain/types'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr } from '@/staff/i18n'

const ROLES: Role[] = ['admin', 'cashier']

/** O'zgarishdan keyin kamida bitta faol admin qolishi shart (aks holda admin paneliga hech kim kira olmaydi). */
function leavesAdmin(users: User[], userId: string, next: Partial<User> | null): boolean {
  return users.some((user) => {
    const result = user.id === userId ? (next ? { ...user, ...next } : null) : user
    return result?.active && result.role === 'admin'
  })
}

/**
 * Xodim biror hujjatda muallif sifatida yozilganmi — bunday xodim o'chirilmaydi (hujjatlarda muallif "—" bo'lib qoladi).
 * Hujjatlarning o'zi ham tekshiriladi: farqsiz inventarizatsiya yoki qarz to'lovi ombor harakati yozmaydi.
 */
function hasHistory(db: Db, userId: string): boolean {
  const byUser = (record: { userId?: string }) => record.userId === userId
  return (
    db.orders.some((order) => order.cashierId === userId || order.history.some(byUser)) ||
    db.purchases.some(byUser) ||
    db.supplierPayments.some(byUser) ||
    db.inventories.some(byUser) ||
    db.writeOffs.some(byUser) ||
    db.expenses.some(byUser) ||
    db.movements.some(byUser)
  )
}

/**
 * Xodim formasi. PIN serverda faqat xesh bo'lib saqlanadi — ko'rsatib bo'lmaydi: yangi xodimga majburiy, tahrirlashda
 * bo'sh qolsa eskisi o'zgarmaydi. Boshqa xodimda bor PIN'ni server rad etadi (`pin_taken`).
 */
function UserModal({ user, users, currentUserId, onClose }: { user: User | null; users: User[]; currentUserId?: string; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'cashier')
  const [pin, setPin] = useState('')
  const [active, setActive] = useState(user?.active ?? true)
  const self = user?.id === currentUserId

  const save = async () => {
    const errors: string[] = []
    if (!name.trim()) errors.push(tr('Ismini kiriting', 'Введите имя'))
    if ((!user || pin) && !/^\d{4,8}$/.test(pin)) errors.push(tr("PIN 4–8 ta raqamdan iborat bo'lsin", 'PIN должен состоять из 4–8 цифр'))
    if (user && !leavesAdmin(users, user.id, { role, active })) errors.push(tr('Kamida bitta faol admin qolishi kerak', 'Должен остаться хотя бы один активный админ'))
    if (self && !active) errors.push(tr("O'zingizni nofaol qila olmaysiz", 'Нельзя сделать неактивным самого себя'))
    // kassir roli bilan admin paneldan darhol chiqarib yuborilardi — rolni boshqa admin o'zgartiradi
    if (self && role !== 'admin') errors.push(tr("O'zingizni admin rolidan olib tashlay olmaysiz", 'Нельзя снять с себя роль админа'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const data = { name: name.trim(), role, active, ...(pin && { pin }) }
    if ((await commit(() => (user ? http.patch(`/users/${user.id}`, data) : http.post('/users', data)))) === null) return
    showToast(user ? tr('Saqlandi', 'Сохранено') : tr("Xodim qo'shildi", 'Сотрудник добавлен'))
    onClose()
  }

  return (
    <Modal
      title={user ? tr('Xodimni tahrirlash', 'Редактирование сотрудника') : tr('Yangi xodim', 'Новый сотрудник')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`btn-ghost ${buttonClass} flex-1`}>
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void save()} className={`btn-primary ${buttonClass} flex-1`}>
            {tr('Saqlash', 'Сохранить')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={tr('Ism familiya', 'Имя и фамилия')} htmlFor="user-name">
          <input id="user-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-600">{tr('Roli', 'Роль')}</p>
          <SegmentedControl label={tr('Roli', 'Роль')} value={role} onChange={setRole} options={ROLES.map((item) => ({ value: item, label: ROLE_LABEL[item] }))} />
          <p className="mt-1 text-xs text-neutral-500">
            {role === 'admin' ? tr('Admin panel va kassa', 'Админ-панель и касса') : tr('Faqat kassa: buyurtmalar va sotuv', 'Только касса: заказы и продажа')}
          </p>
        </div>
        <Field
          label={user ? tr('Yangi PIN kod', 'Новый PIN-код') : tr('PIN kod', 'PIN-код')}
          htmlFor="user-pin"
          hint={
            user
              ? tr("Bo'sh qoldirilsa — eski PIN o'zgarmaydi. PIN serverda yashirin saqlanadi.", 'Если оставить пустым — PIN не изменится. PIN хранится на сервере в скрытом виде.')
              : tr('Kassa va admin paneliga kirish uchun, 4–8 raqam', 'Для входа в кассу и админ-панель, 4–8 цифр')
          }
        >
          <input
            id="user-pin"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            placeholder={user ? '••••' : ''}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
            className={`${inputClass} font-mono tracking-[0.3em]`}
          />
        </Field>
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-neutral-800">{tr('Faol', 'Активен')}</span>
            <span className="block text-xs text-neutral-500">{tr('Nofaol xodim tizimga kira olmaydi', 'Неактивный сотрудник не сможет войти')}</span>
          </span>
          <Switch checked={active} onChange={setActive} label={tr('Faol', 'Активен')} />
        </div>
      </div>
    </Modal>
  )
}

/** Admin → Xodimlar: admin va kassirlar, PIN kodlar (faqat yangisini qo'yish). */
export default function UsersPage() {
  useDocumentTitle(tr('Xodimlar', 'Сотрудники'))
  const db = useDb()
  const current = useCurrentUser()
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const users = [...db.users].sort((a, b) => Number(b.active) - Number(a.active) || a.role.localeCompare(b.role) || a.name.localeCompare(b.name))

  const toggleActive = async (user: User) => {
    if (user.id === current?.id) return explainBlocked(tr('Mumkin emas', 'Нельзя'), tr("O'zingizni nofaol qila olmaysiz.", 'Нельзя сделать неактивным самого себя.'))
    if (user.active && !leavesAdmin(db.users, user.id, { active: false }))
      return explainBlocked(tr('Mumkin emas', 'Нельзя'), tr('Kamida bitta faol admin qolishi kerak.', 'Должен остаться хотя бы один активный админ.'))
    await commit(() => http.patch(`/users/${user.id}`, { active: !user.active }))
  }

  const remove = async (user: User) => {
    if (user.id === current?.id) return explainBlocked(tr("O'chirib bo'lmaydi", 'Нельзя удалить'), tr("O'zingizni o'chira olmaysiz.", 'Нельзя удалить самого себя.'))
    if (!leavesAdmin(db.users, user.id, null))
      return explainBlocked(tr("O'chirib bo'lmaydi", 'Нельзя удалить'), tr('Kamida bitta faol admin qolishi kerak.', 'Должен остаться хотя бы один активный админ.'))
    if (hasHistory(db, user.id)) {
      const result = await AppSwal.fire({
        title: tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        text: tr(
          `${user.name} buyurtma va hujjatlarda qayd etilgan. ${user.active ? "Uning o'rniga nofaol qilinsinmi?" : ''}`,
          `${user.name} указан в заказах и документах. ${user.active ? 'Сделать его неактивным?' : ''}`,
        ),
        icon: 'info',
        showCancelButton: user.active,
        confirmButtonText: user.active ? tr('Nofaol qilish', 'Сделать неактивным') : tr('Tushunarli', 'Понятно'),
      })
      if (result.isConfirmed && user.active) await toggleActive(user)
      return
    }
    if (!(await confirmDanger(tr("Xodimni o'chirish", 'Удаление сотрудника'), tr(`${user.name} o'chiriladi.`, `${user.name} будет удалён.`)))) return
    if ((await commit(() => http.delete(`/users/${user.id}`))) === null) return
    showToast(tr("Xodim o'chirildi", 'Сотрудник удалён'))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Xodimlar', 'Сотрудники')}
        description={tr("Admin va kassirlar; har biri o'z PIN kodi bilan kiradi", 'Админы и кассиры; каждый входит по своему PIN-коду')}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi xodim', 'Новый сотрудник')}
          </button>
        }
      />
      <Card>
        {users.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={UserCog} title={tr("Xodim yo'q", 'Сотрудников нет')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                  <th className={thClass}>{tr('Roli', 'Роль')}</th>
                  <th className={thClass}>PIN</th>
                  <th className={thClass}>{tr('Faol', 'Активен')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-neutral-50 ${user.active ? '' : 'opacity-60'}`}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-fill text-xs font-bold text-white">
                          {user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <span className="font-semibold text-neutral-900">{user.name}</span>
                        {user.id === current?.id && <Badge tone="info">{tr('Siz', 'Вы')}</Badge>}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>{ROLE_LABEL[user.role]}</Badge>
                    </td>
                    <td className={tdClass}>
                      <span
                        className="inline-flex items-center gap-1.5 text-neutral-500"
                        title={tr("PIN yashirin saqlanadi — yangisini «Tahrirlash» da qo'ying", 'PIN хранится скрыто — новый задаётся в «Редактировать»')}
                      >
                        <KeyRound size={14} />
                        <span className="font-mono tracking-[0.2em]">••••</span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <Switch checked={user.active} onChange={() => void toggleActive(user)} label={tr('Faol', 'Активен')} />
                    </td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(user)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(user)}>
                          <Trash size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <UserModal user={editing === 'new' ? null : editing} users={db.users} currentUserId={current?.id} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
