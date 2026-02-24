import { Camera, MessageSquare, Clock, CalendarDays } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'
import PolaroidWidget from '../widgets/PolaroidWidget'
import CalendarWidget from '../widgets/CalendarWidget'
import MusicWidget from '../widgets/MusicWidget'
import AppIcon from './AppIcon'

const HOME_APPS = [
  { id: 'camera', name: 'Camera', icon: Camera, color: '#8E8E93', iconColor: '#FFFFFF' },
  { id: 'forum', name: '论坛', icon: MessageSquare, color: '#5C7CFA', iconColor: '#FFFFFF' },
  { id: 'clock', name: 'Clock', icon: Clock, color: '#1C1C1E', iconColor: '#FFFFFF' },
  { id: 'daily', name: 'Daily', icon: CalendarDays, color: '#E8E8ED', iconColor: '#8E8E93' },
]

export default function HomeScreen() {
  const openApp = usePhoneStore((s) => s.openApp)

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-[16px] pt-[16px] pb-0 scrollbar-none">
      {/* Widgets grid */}
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-[14px]">
        <PolaroidWidget />
        <CalendarWidget />
        <MusicWidget />
      </div>

      {/* App icons */}
      <div className="grid grid-cols-4 gap-y-[8px] justify-items-center mt-[20px] px-[6px]">
        {HOME_APPS.map((app) => (
          <AppIcon
            key={app.id}
            id={app.id}
            name={app.name}
            icon={app.icon}
            color={app.color}
            iconColor={app.iconColor}
            onTap={openApp}
          />
        ))}
      </div>
    </div>
  )
}
