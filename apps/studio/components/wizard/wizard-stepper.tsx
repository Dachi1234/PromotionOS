'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Targeting' },
  { num: 3, label: 'Mechanics' },
  { num: 4, label: 'Triggers' },
  { num: 5, label: 'Rewards' },
  { num: 6, label: 'Frontend' },
  { num: 7, label: 'Review' },
]

interface Props {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

export function WizardStepper({ currentStep, completedSteps, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.num)
        const isCurrent = currentStep === step.num
        const isClickable = isCompleted || step.num <= Math.max(...completedSteps, 0) + 1

        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => isClickable && onStepClick(step.num)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isCurrent && 'bg-primary/10 text-primary',
                isCompleted && !isCurrent && 'text-emerald-400',
                !isCurrent && !isCompleted && 'text-muted-foreground',
                isClickable && 'cursor-pointer hover:bg-accent',
                !isClickable && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isCompleted && !isCurrent && 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
                !isCurrent && !isCompleted && 'border-border',
              )}>
                {isCompleted && !isCurrent ? <Check className="h-4 w-4" /> : step.num}
              </span>
              <span className="hidden lg:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px flex-1 mx-2',
                isCompleted ? 'bg-emerald-500/50' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
