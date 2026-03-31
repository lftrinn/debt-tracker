import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, Milestone } from '@/types/data'

/**
 * Timeline đã được đơn giản hoá trong schema v2 — payoff_timeline bị xoá.
 * Trả về milestones rỗng.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns milestones — danh sách mốc (luôn rỗng trong v2)
 */
export function useTimeline(_d: Ref<AppData>): { milestones: ComputedRef<Milestone[]> } {
  const milestones = computed((): Milestone[] => [])
  return { milestones }
}
