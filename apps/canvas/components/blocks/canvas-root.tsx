'use client'

import type { ReactNode } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'

interface CanvasRootProps {
  children?: ReactNode
}

export const CanvasRoot: UserComponent<CanvasRootProps> = ({ children }) => {
  const { connectors: { connect } } = useNode()
  return (
    <div
      ref={(ref) => { if (ref) connect(ref) }}
      className="min-h-[400px] w-full p-2"
    >
      {children}
    </div>
  )
}

CanvasRoot.craft = {
  displayName: 'Canvas',
  props: {},
  rules: {
    canDrag: () => false,
  },
}
