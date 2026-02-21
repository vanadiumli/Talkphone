import { ChevronLeft, StickyNote } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

export default function MemoApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={closeApp} className="text-ios-blue active:opacity-60 transition-opacity">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">备忘录</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-ios-text-secondary">
        <StickyNote className="w-16 h-16 opacity-20" />
        <p className="text-lg">备忘录</p>
        <p className="text-sm">备忘录功能即将上线</p>
      </div>
    </div>
  )
}
