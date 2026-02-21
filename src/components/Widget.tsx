import type { ReactNode } from 'react'

interface WidgetProps {
  size: 'large' | 'medium'
  children: ReactNode
}

export default function Widget({ size, children }: WidgetProps) {
  const cardHeight = size === 'large' ? 'h-[152px]' : 'h-[152px]'

  return (
    <div className={size === 'large' ? 'col-span-2' : 'col-span-1'}>
      <div className={`bg-white rounded-[22px] p-[14px] ${cardHeight}`}>
        {children}
      </div>
    </div>
  )
}
