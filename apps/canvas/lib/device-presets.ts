/**
 * Canvas preview device presets.
 *
 * The builder's stage-toolbar lets operators pick a specific device model
 * (iPhone 15 Pro, iPad, 1440 desktop, etc.) so they can verify a promo at
 * real-world dimensions before publishing. Widths/heights are in CSS pixels
 * and match each vendor's published specs.
 */

export type DeviceType = 'phone' | 'tablet' | 'desktop'

export interface DevicePreset {
  id: string
  type: DeviceType
  label: string
  width: number
  height: number
  /** Short badge shown inside the device-chrome label strip. */
  short: string
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // Phones
  { id: 'iphone-15-pro',   type: 'phone',   label: 'iPhone 15 Pro',       width: 393,  height: 852,  short: 'iPhone 15 Pro' },
  { id: 'iphone-se',       type: 'phone',   label: 'iPhone SE',           width: 375,  height: 667,  short: 'iPhone SE' },
  { id: 'pixel-7',         type: 'phone',   label: 'Pixel 7',             width: 412,  height: 915,  short: 'Pixel 7' },
  { id: 'galaxy-s22',      type: 'phone',   label: 'Galaxy S22',          width: 360,  height: 780,  short: 'Galaxy S22' },
  { id: 'small-phone',     type: 'phone',   label: 'Small (320)',         width: 320,  height: 568,  short: '320px' },

  // Tablets
  { id: 'ipad',            type: 'tablet',  label: 'iPad',                width: 820,  height: 1180, short: 'iPad' },
  { id: 'ipad-pro-11',     type: 'tablet',  label: 'iPad Pro 11"',        width: 834,  height: 1194, short: 'iPad Pro 11"' },
  { id: 'ipad-pro-13',     type: 'tablet',  label: 'iPad Pro 12.9"',      width: 1024, height: 1366, short: 'iPad Pro 12.9"' },
  { id: 'galaxy-tab-s8',   type: 'tablet',  label: 'Galaxy Tab S8',       width: 800,  height: 1280, short: 'Galaxy Tab S8' },

  // Desktops
  { id: 'desktop-1280',    type: 'desktop', label: '1280 × 800',          width: 1280, height: 800,  short: '1280' },
  { id: 'desktop-1440',    type: 'desktop', label: '1440 × 900',          width: 1440, height: 900,  short: '1440' },
  { id: 'desktop-1920',    type: 'desktop', label: '1920 × 1080 (FHD)',   width: 1920, height: 1080, short: '1920' },
  { id: 'desktop-2560',    type: 'desktop', label: '2560 × 1440 (QHD)',   width: 2560, height: 1440, short: '2560' },
]

export const DEFAULT_PRESETS: Record<DeviceType, DevicePreset> = {
  phone:   DEVICE_PRESETS.find((p) => p.id === 'iphone-15-pro')!,
  tablet:  DEVICE_PRESETS.find((p) => p.id === 'ipad')!,
  desktop: DEVICE_PRESETS.find((p) => p.id === 'desktop-1440')!,
}

export function presetsFor(type: DeviceType): DevicePreset[] {
  return DEVICE_PRESETS.filter((p) => p.type === type)
}

export function getPreset(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((p) => p.id === id)
}
