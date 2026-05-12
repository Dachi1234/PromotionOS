'use client'

import { useEffect } from 'react'
import { useCanvasStore } from '@/stores/canvas-store'
import { MOBILE_BREAKPOINT, type ResponsiveBreakpoint } from '@/lib/responsive'

/** Sync `currentBreakpoint` in the canvas store from the window width.
 *  Mount once in the runtime page. Updates on resize.
 *
 *  Not used in the builder — there the breakpoint is derived from the
 *  stage-toolbar device picker so the operator explicitly controls which
 *  layer they're editing, regardless of the browser size. */
export function useViewportBreakpoint(): void {
  const setCurrentBreakpoint = useCanvasStore((s) => s.setCurrentBreakpoint)
  useEffect(() => {
    const compute = (): ResponsiveBreakpoint =>
      typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
        ? 'mobile'
        : 'desktop'
    setCurrentBreakpoint(compute())
    const onResize = () => setCurrentBreakpoint(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setCurrentBreakpoint])
}
