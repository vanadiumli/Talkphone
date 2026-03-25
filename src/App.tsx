import { useEffect, useMemo, useState } from 'react'
import { usePhoneStore } from './store/phoneStore'
import StatusBar from './components/StatusBar'
import HomeScreen from './components/HomeScreen'
import Dock from './components/Dock'
import ChatApp from './apps/ChatApp'
import SettingsApp from './apps/SettingsApp'
import MemoApp from './apps/MemoApp'
import MemoryApp from './apps/MemoryApp'
import MusicApp from './apps/MusicApp'
import WorldBookApp from './apps/WorldBookApp'
import ForumApp from './apps/ForumApp'
import PlaceholderApp from './apps/PlaceholderApp'

const APP_MAP: Record<string, React.ComponentType> = {
  chat: ChatApp,
  settings: SettingsApp,
  memo: MemoApp,
  memory: MemoryApp,
  music: MusicApp,
  worldbook: WorldBookApp,
  forum: ForumApp,
}

export default function App() {
  const currentApp = usePhoneStore((s) => s.currentApp)
  const closingApp = usePhoneStore((s) => s.closingApp)
  const darkMode = usePhoneStore((s) => s.darkMode)
  const wallpaper = usePhoneStore((s) => s.wallpaper)
  const openApp = usePhoneStore((s) => s.openApp)
  const apiSettings = usePhoneStore((s) => s.apiSettings)
  const conversations = usePhoneStore((s) => s.conversations)

  const apiReady = useMemo(() => {
    return !!apiSettings.baseUrl?.trim() && !!apiSettings.apiKey?.trim()
  }, [apiSettings.baseUrl, apiSettings.apiKey])

  const ActiveApp = currentApp ? (APP_MAP[currentApp] ?? PlaceholderApp) : null

  const ONBOARDING_DONE_KEY = 'tp_onboarding_done_v3'
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ONBOARDING_DONE_KEY, onboardingDone ? '1' : '0')
  }, [onboardingDone])

  // Step 1: API not ready → guide user to open Settings and configure.
  // Step 2: API ready & no conversations yet → guide user to start a chat / create persona.
  const showStep1 = !apiReady && !onboardingDone && currentApp !== 'settings'
  const showStep2 = apiReady && conversations.length === 0 && currentApp === 'chat' && !onboardingDone

  return (
    <div
      className={`h-[100dvh] w-full max-w-[390px] mx-auto flex flex-col bg-ios-bg relative overflow-hidden ${darkMode ? 'dark-mode' : ''}`}
      style={wallpaper ? {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {wallpaper && darkMode && (
        <div className="absolute inset-0 bg-black/40 z-[1] pointer-events-none" />
      )}

      <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
        <StatusBar />
      </div>

      <div className="h-[40px] shrink-0" />

      <HomeScreen />
      <Dock />

      {ActiveApp && (
        <div className={`absolute inset-0 z-50 ${closingApp ? 'animate-slide-down' : 'animate-slide-up'}`}>
          <ActiveApp />
        </div>
      )}

      {(showStep1 || showStep2) && (
        <div className="absolute inset-0 z-[65] pointer-events-none bg-black/20 backdrop-blur-[6px] flex items-end justify-center">
          <div className="pointer-events-auto w-[calc(100%-32px)] mb-[22px] bg-white/95 dark-mode:bg-[#1c1c1e]/95 rounded-[18px] shadow-[0_10px_50px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-4 py-[12px] border-b border-ios-bg flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ios-text truncate">新手引导</p>
                <p className="text-[11px] text-ios-text-secondary mt-[2px]">
                  {showStep1 ? '第 1 步 / 2' : '第 2 步 / 2'}
                </p>
              </div>
              <button
                onClick={() => setOnboardingDone(true)}
                className="w-[26px] h-[26px] rounded-full bg-ios-bg flex items-center justify-center active:opacity-60"
                aria-label="跳过引导"
              >
                <span className="text-[13px] text-ios-text-secondary">×</span>
              </button>
            </div>

            <div className="p-4">
              {showStep1 && (
                <>
                  <p className="text-[14px] font-bold text-ios-text">先配置你的 API</p>
                  <p className="text-[12px] text-ios-text-secondary mt-[6px] leading-relaxed">
                    在「设置」里填写 `baseUrl` 和 `apiKey`，然后再回到聊天。
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openApp('settings')}
                      className="flex-1 bg-[#25D366] text-white rounded-[12px] py-[10px] font-bold text-[13px] active:opacity-85"
                    >
                      去设置
                    </button>
                    <button
                      onClick={() => setOnboardingDone(true)}
                      className="flex-1 bg-ios-bg text-ios-text-secondary rounded-[12px] py-[10px] font-bold text-[13px] active:opacity-70"
                    >
                      稍后再说
                    </button>
                  </div>
                </>
              )}

              {showStep2 && (
                <>
                  <p className="text-[14px] font-bold text-ios-text">开始聊天吧</p>
                  <div className="mt-[8px] space-y-[6px]">
                    <p className="text-[12px] text-ios-text-secondary leading-relaxed">
                      右上角 <span className="font-bold text-ios-blue">+</span>：新建聊天
                    </p>
                    <p className="text-[12px] text-ios-text-secondary leading-relaxed">
                      点击底部 <span className="font-bold text-ios-blue">通讯录</span>：新建人设（角色）
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setOnboardingDone(true)}
                      className="w-full bg-ios-blue text-white rounded-[12px] py-[10px] font-bold text-[13px] active:opacity-85"
                    >
                      我知道了
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
