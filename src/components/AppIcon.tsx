import type { LucideIcon } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

interface AppIconProps {
  id: string
  name: string
  icon: LucideIcon
  color?: string
  iconColor?: string
  onTap: (id: string) => void
}

export default function AppIcon({
  id,
  name,
  icon: Icon,
  color = '#E5E5EA',
  iconColor = '#FFFFFF',
  onTap,
}: AppIconProps) {
  const customIcon = usePhoneStore((s) => s.customIcons[id])

  return (
    <button
      onClick={() => onTap(id)}
      className="flex flex-col items-center gap-[5px] active:scale-90 transition-transform duration-150"
    >
      {customIcon ? (
        <img src={customIcon} alt={name}
          className="w-[52px] h-[52px] rounded-[13px] object-cover" />
      ) : (
        <div
          className="w-[52px] h-[52px] rounded-[13px] flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-[23px] h-[23px]" style={{ color: iconColor }} strokeWidth={1.9} />
        </div>
      )}
      <span className="text-[11px] font-semibold text-ios-text">{name}</span>
    </button>
  )
}
