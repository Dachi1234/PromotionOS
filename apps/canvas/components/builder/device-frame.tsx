'use client'

import type { DevicePreset } from '@/lib/device-presets'
import { Monitor, Smartphone, Tablet } from 'lucide-react'

interface DeviceFrameProps {
  preset: DevicePreset
  children: React.ReactNode
  /** Optional explicit scale factor (1 = 100%). Applied via CSS transform
   *  so nested Craft.js pointer events stay correct. */
  scale?: number
}

/** Wraps canvas content in device-appropriate chrome:
 *  - phone: rounded bezel, notch, status bar (9:41, battery)
 *  - tablet: thinner bezel, camera dot, status bar
 *  - desktop: browser window chrome with traffic-light dots + URL bar
 *
 *  The inner content area always matches the preset's exact width/height
 *  so templates see real viewport dimensions.
 */
export function DeviceFrame({ preset, children, scale = 1 }: DeviceFrameProps) {
  const Icon = preset.type === 'phone' ? Smartphone : preset.type === 'tablet' ? Tablet : Monitor

  return (
    <div className="device-frame-wrapper">
      <div className="device-frame-label">
        <Icon size={11} />
        <span>{preset.label} · {preset.width} × {preset.height}</span>
      </div>
      <div
        className={`device-frame device-frame-${preset.type}`}
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {preset.type === 'phone' && (
          <>
            <div className="device-phone-notch" aria-hidden />
            <div className="device-phone-statusbar" aria-hidden>
              <span>9:41</span>
              <span>●●● 98%</span>
            </div>
          </>
        )}
        {preset.type === 'tablet' && (
          <>
            <div className="device-tablet-camera" aria-hidden />
            <div className="device-tablet-statusbar" aria-hidden>
              <span>9:41</span>
              <span>●●● 92%</span>
            </div>
          </>
        )}
        {preset.type === 'desktop' && (
          <div className="device-desktop-chrome" aria-hidden>
            <div className="device-desktop-dots">
              <span /><span /><span />
            </div>
            <div className="device-desktop-urlbar">summer-jackpot.promotionos.app</div>
          </div>
        )}
        <div
          className="device-frame-content"
          style={{
            width: preset.width,
            minHeight: preset.height,
            // Flex column so the Craft.js ROOT (CanvasRoot) can stretch to
            // fill the full device height — otherwise the canvas background
            // only covers what content fits above it.
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
