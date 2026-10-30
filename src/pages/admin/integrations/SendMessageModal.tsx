import { Send } from 'lucide-react'
import { useState } from 'react'
import { errorText } from '@/api/errors'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { buttonClass, textareaClass } from '@/components/ui/styles'
import { refreshTelegram, telegramApi } from '@/integrations/telegram/store'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'

type Props = {
  chatId: number
  name: string
  onClose: () => void
}

/** Bitta obunachiga xabar (javob) — server yuboradi va "Xabarlar" ro'yxatiga yozadi. */
export default function SendMessageModal({ chatId, name, onClose }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      await telegramApi.send(chatId, text.trim())
      showToast(tr('Xabar yuborildi', 'Сообщение отправлено'))
      void refreshTelegram()
      onClose()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`${tr('Xabar', 'Сообщение')}: ${name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`btn-ghost ${buttonClass} flex-1`}>
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void send()} disabled={busy || !text.trim()} className={`btn-primary ${buttonClass} flex-1`}>
            <Send size={15} />
            {busy ? tr('Yuborilmoqda…', 'Отправка…') : tr('Yuborish', 'Отправить')}
          </button>
        </>
      }
    >
      <Field
        label={tr('Matn', 'Текст')}
        htmlFor="tg-message"
        hint={tr('<b>qalin</b>, <i>kursiv</i> belgilari ishlaydi', 'Работает разметка <b>жирный</b>, <i>курсив</i>')}
      >
        <textarea id="tg-message" rows={5} value={text} onChange={(event) => setText(event.target.value)} autoFocus className={textareaClass} />
      </Field>
      {error && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}
