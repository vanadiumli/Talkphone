import { useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, RefreshCw, Key, Moon, Palette, Info, MessageSquare, ImagePlus, Trash2 } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

const PRESET_MODELS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo',
  'claude-3.5-sonnet', 'claude-3-haiku',
  'deepseek-chat', 'deepseek-reasoner',
]

const CUSTOMIZABLE_APPS = [
  { id: 'chat', name: 'Chats' },
  { id: 'moments', name: 'Moments' },
  { id: 'discover', name: 'Discover' },
  { id: 'settings', name: 'Settings' },
  { id: 'camera', name: 'Camera' },
  { id: 'clock', name: 'Clock' },
  { id: 'daily', name: 'Daily' },
  { id: 'book', name: 'Book' },
]

type TestStatus = 'idle' | 'testing' | 'success' | 'error' | 'errorDetail'
type Page = 'main' | 'api' | 'models' | 'theme'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 shrink-0 ${on ? 'bg-green-500' : 'bg-[#e5e5ea]'}`}>
      <div className={`w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-[20px]' : 'translate-x-0'}`} />
    </button>
  )
}

function SettingsRow({ icon, iconBg, label, right, onClick, last = false }: {
  icon: React.ReactNode; iconBg: string; label: string
  right?: React.ReactNode; onClick?: () => void; last?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`w-full flex items-center gap-[12px] px-4 py-[11px] active:bg-ios-bg/50 transition-colors ${!last ? 'border-b border-ios-bg' : ''}`}>
      <div className={`w-[29px] h-[29px] rounded-[7px] flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="text-[16px] text-ios-text flex-1 text-left">{label}</span>
      {right}
    </Tag>
  )
}

export default function SettingsApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)
  const { apiSettings, setApiSettings, darkMode, setDarkMode, wallpaper, setWallpaper, customIcons, setCustomIcon, removeCustomIcon } = usePhoneStore()
  const [page, setPage] = useState<Page>('main')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [saved, setSaved] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [toast, setToast] = useState('')
  const wallpaperRef = useRef<HTMLInputElement>(null)
  const iconRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const apiBase = useMemo(() => apiSettings.baseUrl.replace(/\/+$/, ''), [apiSettings.baseUrl])
  const chevron = <ChevronRight className="w-5 h-5 text-ios-text-secondary/40 shrink-0" />

  const [testError, setTestError] = useState('')
  async function testConnection() {
    if (!apiBase || !apiSettings.apiKey) return
    setTestStatus('testing')
    setTestError('')
    try {
      // Test the actual /chat/completions endpoint (not just /models)
      const res = await fetch(apiBase + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiSettings.apiKey}` },
        body: JSON.stringify({
          model: apiSettings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        setTestError(`${res.status}: ${errText.slice(0, 100)}`)
        setTestStatus('errorDetail')
      } else {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (content !== undefined) {
          setTestStatus('success')
        } else {
          setTestError('API 返回格式异常，无 choices 字段')
          setTestStatus('errorDetail')
        }
      }
    } catch (e) {
      setTestError((e as Error).message || '网络错误')
      setTestStatus('errorDetail')
    }
    setTimeout(() => setTestStatus('idle'), 6000)
  }

  async function fetchModels() {
    if (!apiBase || !apiSettings.apiKey) return
    setFetchingModels(true)
    try {
      const res = await fetch(apiBase + '/models', { headers: { Authorization: `Bearer ${apiSettings.apiKey}` } })
      if (res.ok) {
        const json = await res.json()
        setFetchedModels((json.data || []).map((m: { id: string }) => m.id).sort())
      }
    } catch { /* ignore */ }
    setFetchingModels(false)
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const tempPercent = (apiSettings.temperature / 2) * 100

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  function handleImageUpload(cb: (dataUrl: string) => void, msg?: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => { cb(reader.result as string); if (msg) showToast(msg) }
      reader.readAsDataURL(file)
      e.target.value = ''
    }
  }

  const allModels = fetchedModels.length > 0 ? fetchedModels : PRESET_MODELS

  return (
    <div className="relative h-full overflow-hidden bg-ios-bg">
      {/* === Main Settings (always rendered) === */}
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
          <button onClick={closeApp} className="text-ios-blue active:opacity-60 transition-opacity">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">设置</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">
          <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px]">通用</p>
          <div className="bg-card rounded-[14px] overflow-hidden">
            <SettingsRow icon={<Key className="w-[16px] h-[16px] text-white" />} iconBg="bg-[#C9867E]"
              label="API 设置"
              right={<div className="flex items-center gap-1"><span className="text-[14px] text-ios-text-secondary">{apiSettings.model || '未配置'}</span>{chevron}</div>}
              onClick={() => setPage('api')} />
            <SettingsRow icon={<Moon className="w-[16px] h-[16px] text-white" />} iconBg="bg-indigo-500"
              label="夜间模式"
              right={<Toggle on={darkMode} onToggle={() => setDarkMode(!darkMode)} />} />
            <SettingsRow icon={<Palette className="w-[16px] h-[16px] text-white" />} iconBg="bg-pink-400"
              label="更改主题" right={chevron} onClick={() => setPage('theme')} last />
          </div>
          <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px] mt-6">关于</p>
          <div className="bg-card rounded-[14px] overflow-hidden">
            <SettingsRow icon={<MessageSquare className="w-[16px] h-[16px] text-white" />} iconBg="bg-orange-400"
              label="反馈建议" right={chevron} onClick={() => {}} />
            <SettingsRow icon={<Info className="w-[16px] h-[16px] text-white" />} iconBg="bg-gray-400"
              label="版本" right={<span className="text-[14px] text-ios-text-secondary">1.0.0</span>} last />
          </div>
        </div>
      </div>

      {/* === API Config (overlay) === */}
      {(page === 'api' || page === 'models') && (
        <div className="absolute inset-0 z-10 animate-page-push bg-ios-bg">
          <div className="flex flex-col h-full">
            <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
              <button onClick={() => setPage('main')} className="text-ios-blue active:opacity-60 transition-opacity">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">API 配置</h1>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">
              <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px]">连接</p>
              <div className="bg-card rounded-[14px] overflow-hidden">
                <div className="px-4 py-[12px] border-b border-ios-bg">
                  <label className="text-[12px] font-semibold text-ios-text-secondary mb-[6px] block">接入地址</label>
                  <input value={apiSettings.baseUrl} onChange={(e) => setApiSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-ios-bg rounded-[10px] px-3 py-[9px] text-[14px] text-ios-text outline-none placeholder:text-ios-text-secondary/50" />
                  <p className="text-[11px] text-ios-text-secondary/70 mt-[4px]">请在地址末尾手动加上 /v1</p>
                </div>
                <div className="px-4 py-[12px]">
                  <label className="text-[12px] font-semibold text-ios-text-secondary mb-[6px] block">API 密钥</label>
                  <input type="password" value={apiSettings.apiKey} onChange={(e) => setApiSettings({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-ios-bg rounded-[10px] px-3 py-[9px] text-[14px] text-ios-text outline-none placeholder:text-ios-text-secondary/50" />
                </div>
              </div>
              <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px] mt-5">模型</p>
              <div className="bg-card rounded-[14px] overflow-hidden">
                <button onClick={() => setPage('models')}
                  className="w-full flex items-center justify-between px-4 py-[14px] active:bg-ios-bg/50 transition-colors">
                  <span className="text-[15px] text-ios-text">选择模型</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[15px] text-ios-text-secondary">{apiSettings.model || '未选择'}</span>
                    {chevron}
                  </div>
                </button>
              </div>
              <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px] mt-5">参数</p>
              <div className="bg-card rounded-[14px] overflow-hidden px-4 py-[12px]">
                <div className="flex items-center justify-between mb-[10px]">
                  <span className="text-[15px] text-ios-text">温度</span>
                  <span className="text-[15px] text-ios-blue font-semibold tabular-nums">{apiSettings.temperature.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="2" step="0.1" value={apiSettings.temperature}
                  onChange={(e) => setApiSettings({ temperature: parseFloat(e.target.value) })}
                  className="slider-pink"
                  style={{ background: `linear-gradient(to right, #C9867E ${tempPercent}%, #e5e5ea ${tempPercent}%)` }} />
                <div className="flex justify-between text-[10px] text-ios-text-secondary mt-[6px]">
                  <span>精确</span><span>平衡</span><span>创意</span>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <button onClick={testConnection}
                  disabled={testStatus === 'testing' || !apiBase || !apiSettings.apiKey}
                  className="w-full bg-card rounded-[12px] py-[12px] text-[16px] font-semibold flex items-center justify-center gap-2 active:bg-ios-bg transition-colors disabled:opacity-40">
                  {testStatus === 'testing' && <Loader2 className="w-5 h-5 animate-spin text-ios-blue" />}
                  {testStatus === 'success' && <Check className="w-5 h-5 text-green-500" />}
                  {(testStatus === 'error' || testStatus === 'errorDetail') && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <span className={testStatus === 'success' ? 'text-green-600' : (testStatus === 'error' || testStatus === 'errorDetail') ? 'text-red-500' : 'text-ios-blue'}>
                    {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? `连接成功（${apiSettings.model || 'default'}）` : (testStatus === 'error' || testStatus === 'errorDetail') ? '连接失败' : '测试连接'}
                  </span>
                </button>
                {testStatus === 'errorDetail' && testError && (
                  <div className="bg-red-50 rounded-[10px] px-3 py-[8px]">
                    <p className="text-[11px] text-red-500 break-all">{testError}</p>
                  </div>
                )}
                <button onClick={handleSave}
                  className="w-full bg-ios-blue text-white rounded-[12px] py-[12px] text-[16px] font-semibold active:opacity-80 transition-opacity flex items-center justify-center gap-2">
                  {saved && <Check className="w-5 h-5" />}
                  {saved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          </div>

          {/* === Model Picker (overlay on top of API) === */}
          {page === 'models' && (
            <div className="absolute inset-0 z-20 animate-page-push bg-ios-bg">
              <div className="flex flex-col h-full">
                <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
                  <button onClick={() => setPage('api')} className="text-ios-blue active:opacity-60 transition-opacity">
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                  <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">选择模型</h1>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 scrollbar-none">
                  <button onClick={fetchModels} disabled={fetchingModels || !apiBase || !apiSettings.apiKey}
                    className="w-full flex items-center justify-center gap-2 bg-card rounded-[14px] py-[12px] mb-4 text-[14px] font-semibold text-ios-blue active:bg-ios-bg transition-colors disabled:opacity-40">
                    <RefreshCw className={`w-4 h-4 ${fetchingModels ? 'animate-spin' : ''}`} />
                    {fetchingModels ? '拉取中...' : '从 API 拉取模型列表'}
                  </button>
                  <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px]">
                    {fetchedModels.length > 0 ? `已拉取 ${fetchedModels.length} 个模型` : '预设模型'}
                  </p>
                  <div className="bg-card rounded-[14px] overflow-hidden">
                    {allModels.map((m, i) => (
                      <button key={m} onClick={() => { setApiSettings({ model: m }); setPage('api') }}
                        className={`w-full flex items-center justify-between px-4 py-[13px] active:bg-ios-bg transition-colors ${i < allModels.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                        <span className="text-[15px] text-ios-text truncate mr-2">{m}</span>
                        {apiSettings.model === m && <Check className="w-5 h-5 text-ios-blue shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="bg-card rounded-[14px] mt-4 p-4">
                    <label className="text-[12px] font-semibold text-ios-text-secondary mb-2 block">自定义模型名</label>
                    <div className="flex gap-2">
                      <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="输入模型 ID..."
                        className="flex-1 bg-ios-bg rounded-[10px] px-3 py-[10px] text-[15px] text-ios-text outline-none placeholder:text-ios-text-secondary/50" />
                      <button onClick={() => { if (customModel.trim()) { setApiSettings({ model: customModel.trim() }); setPage('api') } }}
                        className="bg-ios-blue text-white rounded-[10px] px-4 text-[14px] font-semibold shrink-0 active:opacity-80">确定</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Theme Page (overlay) === */}
      {page === 'theme' && (
        <div className="absolute inset-0 z-10 animate-page-push bg-ios-bg">
          <div className="flex flex-col h-full">
            <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
              <button onClick={() => setPage('main')} className="text-ios-blue active:opacity-60 transition-opacity">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <h1 className="text-[17px] font-semibold text-ios-text flex-1 text-center pr-[28px]">更改主题</h1>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">
              <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px]">壁纸</p>
              <div className="bg-card rounded-[14px] p-4 mb-5">
                {wallpaper ? (
                  <div className="relative rounded-[10px] overflow-hidden mb-3">
                    <img src={wallpaper} alt="" className="w-full h-[140px] object-cover rounded-[10px]" />
                    <button onClick={() => { setWallpaper(null); showToast('壁纸已移除') }}
                      className="absolute top-2 right-2 w-[28px] h-[28px] rounded-full bg-black/50 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-[100px] bg-ios-bg rounded-[10px] flex items-center justify-center mb-3">
                    <ImagePlus className="w-8 h-8 text-ios-text-secondary/40" />
                  </div>
                )}
                <button onClick={() => wallpaperRef.current?.click()}
                  className="w-full bg-ios-blue text-white rounded-[10px] py-[9px] text-[14px] font-semibold active:opacity-80 transition-opacity">
                  {wallpaper ? '更换壁纸' : '选择壁纸'}
                </button>
                <input ref={wallpaperRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setWallpaper, '壁纸已更换')} />
              </div>
              <p className="text-[13px] font-semibold text-ios-text-secondary uppercase px-1 mb-[6px]">应用图标</p>
              <div className="bg-card rounded-[14px] overflow-hidden">
                {CUSTOMIZABLE_APPS.map((app, i) => (
                  <div key={app.id} className={`flex items-center gap-3 px-4 py-[10px] ${i < CUSTOMIZABLE_APPS.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                    {customIcons[app.id] ? (
                      <img src={customIcons[app.id]} alt="" className="w-[36px] h-[36px] rounded-[8px] object-cover shrink-0" />
                    ) : (
                      <div className="w-[36px] h-[36px] rounded-[8px] bg-ios-bg shrink-0 flex items-center justify-center">
                        <ImagePlus className="w-4 h-4 text-ios-text-secondary/40" />
                      </div>
                    )}
                    <span className="text-[15px] text-ios-text flex-1">{app.name}</span>
                    <div className="flex items-center gap-2">
                      {customIcons[app.id] && (
                        <button onClick={() => removeCustomIcon(app.id)}
                          className="text-ios-text-secondary/50 active:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => iconRefs.current[app.id]?.click()}
                        className="text-[13px] text-ios-blue font-semibold active:opacity-60">
                        {customIcons[app.id] ? '更换' : '上传'}
                      </button>
                    </div>
                    <input ref={(el) => { iconRefs.current[app.id] = el }}
                      type="file" accept="image/*" className="hidden"
                      onChange={handleImageUpload((url) => setCustomIcon(app.id, url), '图标已更换')} />
                  </div>
                ))}
              </div>
            </div>
            {toast && (
              <div className="absolute top-[60px] left-1/2 -translate-x-1/2 bg-[#1a1a1a]/80 text-white text-[14px] font-medium px-5 py-2 rounded-full animate-toast z-50 backdrop-blur-sm">
                {toast}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
