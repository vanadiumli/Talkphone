import { usePhoneStore } from './store/phoneStore'
import StatusBar from './components/StatusBar'
import HomeScreen from './components/HomeScreen'
import Dock from './components/Dock'
import ChatApp from './apps/ChatApp'
import SettingsApp from './apps/SettingsApp'
import MemoApp from './apps/MemoApp'
import MemoryApp from './apps/MemoryApp'
import MusicApp from './apps/MusicApp'
import PlaceholderApp from './apps/PlaceholderApp'

const APP_MAP: Record<string, React.ComponentType> = {
  chat: ChatApp,
  settings: SettingsApp,
  memo: MemoApp,
  memory: MemoryApp,
  music: MusicApp,
}

export default function App() {
  const currentApp = usePhoneStore((s) => s.currentApp)
  const closingApp = usePhoneStore((s) => s.closingApp)
  const darkMode = usePhoneStore((s) => s.darkMode)
  const wallpaper = usePhoneStore((s) => s.wallpaper)
  const ActiveApp = currentApp ? (APP_MAP[currentApp] ?? PlaceholderApp) : null

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
    </div>
  )
}
