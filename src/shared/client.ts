export async function send<T>(message: Record<string, unknown>): Promise<T> {
  const response = await chrome.runtime.sendMessage(message)
  if (!response?.ok) throw new Error(response?.error ?? "扩展后台未响应，请重新加载扩展")
  return response.data as T
}
