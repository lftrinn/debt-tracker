import { ref } from 'vue'

export type ToastType = 'ok' | 'err'

export function useToast() {
  const toastMsg = ref('')
  const toastType = ref<ToastType>('ok')
  const toastTrigger = ref(0)

  function toast(msg: string, type: ToastType = 'ok'): void {
    toastMsg.value = msg
    toastType.value = type
    toastTrigger.value++
  }

  return { toastMsg, toastType, toastTrigger, toast }
}
