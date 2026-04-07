import { sendToParent } from './post-message'

let lastHeight = 0

export function reportHeight() {
  if (typeof document === 'undefined') return
  const height = document.documentElement.scrollHeight
  if (height !== lastHeight) {
    lastHeight = height
    sendToParent({ type: 'CANVAS_HEIGHT', height })
  }
}

export function startAutoHeight() {
  if (typeof window === 'undefined') return () => {}
  const observer = new MutationObserver(() => reportHeight())
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
  const interval = setInterval(reportHeight, 1000)
  reportHeight()
  return () => {
    observer.disconnect()
    clearInterval(interval)
  }
}
