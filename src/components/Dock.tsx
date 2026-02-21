import { MessageCircle, Brain, BookOpen, Settings } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

const DOCK_APPS = [
  { id: 'chat', icon: MessageCircle, label: '消息' },
  { id: 'memory', icon: Brain, label: '记忆' },
  { id: 'discover', icon: BookOpen, label: '书架' },
  { id: 'settings', icon: Settings, label: '设置' },
] as const

export default function Dock() {
  const openApp = usePhoneStore((s) => s.openApp)
  const customIcons = usePhoneStore((s) => s.customIcons)

  return (
    <div className="shrink-0 px-[16px] pb-[14px] pt-[6px]">
      <div className="flex justify-between items-center rounded-[22px] px-[14px] py-[10px] bg-dock">
        {DOCK_APPS.map((app) => {
          const Icon = app.icon
          const custom = customIcons[app.id]
          return (
            <button key={app.id} onClick={() => openApp(app.id)}
              className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform duration-150">
              {custom ? (
                <img src={custom} alt={app.label} className="w-[52px] h-[52px] rounded-[13px] object-cover" />
              ) : (
                <div className="w-[52px] h-[52px] rounded-[13px] bg-ios-bg flex items-center justify-center">
                  <Icon className="w-[23px] h-[23px] text-ios-text" strokeWidth={1.8} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
