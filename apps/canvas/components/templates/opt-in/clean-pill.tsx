'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { OptInTemplateProps } from '../shared-types'

export function CleanPill({
  optedIn, eligible, onOptIn, preLabel, postLabel,
  accentColor = '#6366f1', textColor = '#ffffff', bgColor = '#ffffff',
}: OptInTemplateProps) {
  const reduced = useReducedMotion()

  if (optedIn) {
    return (
      <div className="w-full max-w-xs mx-auto">
        <motion.div
          className="flex items-center justify-center gap-2 py-2.5 px-6 rounded-full text-sm font-semibold"
          style={{
            border: `2px solid ${accentColor}`,
            color: accentColor,
            background: `${accentColor}08`,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, duration: reduced ? 0 : undefined }}
        >
          <Check size={16} strokeWidth={3} />
          <span>{postLabel}</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <motion.button
        onClick={eligible ? onOptIn : undefined}
        disabled={!eligible}
        className="w-full py-2.5 px-6 rounded-full text-sm font-semibold transition-shadow"
        style={{
          background: eligible ? accentColor : '#e5e7eb',
          color: eligible ? textColor : '#9ca3af',
          cursor: eligible ? 'pointer' : 'not-allowed',
          boxShadow: eligible ? `0 2px 8px ${accentColor}25` : 'none',
        }}
        whileHover={eligible && !reduced ? { scale: 1.03, boxShadow: `0 4px 16px ${accentColor}35` } : {}}
        whileTap={eligible ? { scale: 0.97 } : {}}
      >
        {preLabel}
      </motion.button>
    </div>
  )
}
