import { describe, it, expect } from 'vitest'
import { useToast } from '../useToast'

describe('useToast', () => {
  it('khởi tạo với giá trị mặc định', () => {
    const { toastMsg, toastType, toastTrigger } = useToast()
    expect(toastMsg.value).toBe('')
    expect(toastType.value).toBe('ok')
    expect(toastTrigger.value).toBe(0)
  })

  it('toast() đặt message và type mặc định "ok"', () => {
    const { toast, toastMsg, toastType } = useToast()
    toast('Đã thêm chi tiêu')
    expect(toastMsg.value).toBe('Đã thêm chi tiêu')
    expect(toastType.value).toBe('ok')
  })

  it('toast() với type "err"', () => {
    const { toast, toastType } = useToast()
    toast('Lỗi kết nối', 'err')
    expect(toastType.value).toBe('err')
  })

  it('toast() tăng trigger mỗi lần gọi', () => {
    const { toast, toastTrigger } = useToast()
    toast('msg 1')
    expect(toastTrigger.value).toBe(1)
    toast('msg 2')
    expect(toastTrigger.value).toBe(2)
    toast('msg 3')
    expect(toastTrigger.value).toBe(3)
  })

  it('gọi toast() nhiều lần với type khác nhau', () => {
    const { toast, toastMsg, toastType, toastTrigger } = useToast()
    toast('Thành công')
    expect(toastMsg.value).toBe('Thành công')
    expect(toastType.value).toBe('ok')
    toast('Lỗi', 'err')
    expect(toastMsg.value).toBe('Lỗi')
    expect(toastType.value).toBe('err')
    expect(toastTrigger.value).toBe(2)
  })

  it('mỗi useToast() là instance độc lập', () => {
    const a = useToast()
    const b = useToast()
    a.toast('A message')
    expect(a.toastMsg.value).toBe('A message')
    expect(b.toastMsg.value).toBe('')
    expect(a.toastTrigger.value).toBe(1)
    expect(b.toastTrigger.value).toBe(0)
  })
})
