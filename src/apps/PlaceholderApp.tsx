import { ChevronLeft } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

const TITLES: Record<string, string> = {
  moments: '朋友圈',
  discover: '发现',
  camera: '相机',
  forum: '论坛',
  clock: '时钟',
  daily: 'Daily',
  book: 'Book',
}

export default function PlaceholderApp() {
  const { currentApp, closeApp } = usePhoneStore()
  const title = currentApp ? (TITLES[currentApp] ?? '应用') : '应用'

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={closeApp} className="text-ios-blue active:opacity-60 transition-opacity">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">{title}</h1>
      </div>

      <div className="flex-1 flex items-center justify-center text-ios-text-secondary">
        <p className="text-sm">{title} 功能即将上线</p>
      </div>
    </div>
  )
}
