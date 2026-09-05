import type { NoticeType } from "./notifications"
export interface EngineCapabilities {
  manual: boolean
  poll(callback: () => void, interval: number): number
  clearPoll(id: number): void
  notify(type: NoticeType, html: string, duration?: number): void
  setTitle(title: string): void
  navigate(url: string): void
  reload(): void
  updateForm(url: string): void
}
