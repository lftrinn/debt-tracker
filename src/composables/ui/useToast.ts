import { ref } from 'vue'

export type ToastType = 'ok' | 'err'

/**
 * Quản lý trạng thái thông báo toast ngắn hạn cho các hành động người dùng.
 * toastTrigger tăng mỗi lần gọi để component con có thể watch và kích hoạt animation.
 * @returns toastMsg, toastType, toastTrigger, toast
 */
export function useToast() {
  const toastMsg = ref('')
  const toastType = ref<ToastType>('ok')
  const toastTrigger = ref(0)

  /**
   * Hiển thị toast với nội dung và loại chỉ định.
   * @param msg - Nội dung thông báo (i18n key hoặc chuỗi trực tiếp)
   * @param type - Loại toast: 'ok' cho thành công, 'err' cho lỗi
   */
  function toast(msg: string, type: ToastType = 'ok'): void {
    toastMsg.value = msg
    toastType.value = type
    toastTrigger.value++
  }

  return { toastMsg, toastType, toastTrigger, toast }
}
