import { useRef, useState } from 'react'
import { ChevronLeft, Upload, Play, Pause, Trash2, Music2, Check } from 'lucide-react'
import { usePhoneStore, type MusicTrack } from '../store/phoneStore'

// Category/asset stop words — indicate a library/sound-effect filename, not a real title
const ASSET_WORDS = new Set(['music', 'audio', 'sound', 'track', 'song', 'video', 'background',
  'loop', 'ambient', 'royalty', 'free', 'effect', 'sfx', 'educational', 'school', 'education',
  'training', 'sample', 'beat', 'instrumental', 'acoustic', 'electric', 'piano', 'guitar',
  'drum', 'bass', 'vocal', 'mix', 'remix', 'original', 'version', 'full', 'short', 'intro', 'outro'])

function parseFilename(raw: string): { name: string; artist: string } {
  const noExt = raw.replace(/\.[^/.]+$/, '').trim()
  const cleaned = noExt.replace(/^\d+[\s.\-–]+/, '').trim()

  const segments = cleaned.split(/\s*[-–_]\s*/).map(s => s.trim()).filter(Boolean)

  const lastSeg = segments[segments.length - 1] ?? ''
  const hasTrailingId = /^\d{4,}$/.test(lastSeg)
  const allLower = segments.every(s => s === s.toLowerCase())
  const isAssetFile = hasTrailingId && allLower && segments.length >= 3

  if (isAssetFile) {
    const meaningful = segments.slice(0, -1)
    const title = meaningful.find(s => !ASSET_WORDS.has(s.toLowerCase()))
    if (title) return { artist: '未知', name: title.charAt(0).toUpperCase() + title.slice(1) }
    const last = meaningful[meaningful.length - 1] ?? cleaned
    return { artist: '未知', name: last.charAt(0).toUpperCase() + last.slice(1) }
  }

  if (segments.length === 2) {
    const [a, b] = segments
    if (!/\d{4,}/.test(a) && !/\d{4,}/.test(b)) {
      if (a.length <= b.length) return { artist: a.trim(), name: b.trim() }
      return { artist: b.trim(), name: a.trim() }
    }
  }

  const name = cleaned
    .replace(/\d{4,}/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return { artist: '未知', name: name || noExt }
}

export default function MusicApp() {
  const { closeApp, playlist, currentTrackIndex, isPlaying, addTrack, removeTrack, setCurrentTrack, setIsPlaying } = usePhoneStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const file of files) {
      const url = URL.createObjectURL(file)
      const { name, artist } = parseFilename(file.name)
      // Decode audio to get exact duration — more reliable than audio.duration events
      let dur = 0
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const ab = await file.arrayBuffer()
        const buf = await ctx.decodeAudioData(ab)
        dur = buf.duration
        ctx.close()
      } catch { /* unsupported format — duration stays 0 */ }
      addTrack({ name, artist, blobUrl: url, duration: dur, liked: false })
    }
  }

  function playIndex(idx: number) {
    if (editMode) return
    if (idx === currentTrackIndex) setIsPlaying(!isPlaying)
    else setCurrentTrack(idx)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deleteSelected() {
    selected.forEach(id => {
      const idx = playlist.findIndex(t => t.id === id)
      if (idx === currentTrackIndex && isPlaying) setIsPlaying(false)
      removeTrack(id)
    })
    setSelected(new Set())
    setEditMode(false)
  }

  function exitEdit() {
    setEditMode(false)
    setSelected(new Set())
  }

  function toggleSelectAll() {
    if (selected.size === playlist.length) setSelected(new Set())
    else setSelected(new Set(playlist.map(t => t.id)))
  }

  return (
    <div className="absolute inset-0 z-50 animate-slide-up">
      <div className="relative flex flex-col h-full" style={{ background: '#f7f7f7' }}>

        {/* Header */}
        <div className="flex items-center px-4 pt-[52px] pb-[14px] shrink-0 bg-[#f7f7f7]"
          style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
          {editMode ? (
            <>
              <button onClick={exitEdit} className="text-[14px] text-[#555] active:opacity-60 mr-3">取消</button>
              <h1 className="flex-1 text-[17px] font-bold text-[#1a1a1a]">
                {selected.size > 0 ? `已选 ${selected.size} 首` : '选择歌曲'}
              </h1>
              <button onClick={toggleSelectAll}
                className="text-[13px] text-[#555] active:opacity-60 mr-3">
                {selected.size === playlist.length ? '取消全选' : '全选'}
              </button>
              {selected.size > 0 && (
                <button onClick={deleteSelected}
                  className="flex items-center gap-1 px-3 py-[7px] rounded-full bg-red-500 active:opacity-80">
                  <Trash2 className="w-[12px] h-[12px] text-white" strokeWidth={2} />
                  <span className="text-[12px] font-medium text-white">删除</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={closeApp} className="active:opacity-60 mr-2">
                <ChevronLeft className="w-7 h-7 text-[#333]" />
              </button>
              <h1 className="flex-1 text-[17px] font-bold text-[#1a1a1a]">播放列表</h1>
              <span className="text-[12px] text-[#aaa] mr-3">{playlist.length} 首</span>
              {playlist.length > 0 && (
                <button onClick={() => setEditMode(true)}
                  className="text-[14px] text-[#555] font-medium active:opacity-60 mr-3">编辑</button>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-[7px] rounded-full bg-[#1a1a1a] active:opacity-80 transition-opacity">
                <Upload className="w-[12px] h-[12px] text-white" strokeWidth={2} />
                <span className="text-[12px] font-medium text-white">上传</span>
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileUpload} />
        </div>

        {/* Playlist */}
        <div className="flex-1 overflow-y-auto scrollbar-none pb-8">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
              <Music2 className="w-14 h-14 text-[#ddd]" strokeWidth={1} />
              <p className="text-[14px] text-[#bbb] font-medium">暂无音乐</p>
              <button onClick={() => fileRef.current?.click()}
                className="px-5 py-[9px] rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium active:opacity-80">
                点击上传本地音乐
              </button>
            </div>
          ) : (
            <div className="bg-white mx-4 mt-4 rounded-[16px] overflow-hidden"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              {playlist.map((t: MusicTrack, i: number) => {
                const active = i === currentTrackIndex
                const playing = active && isPlaying
                const isSelected = selected.has(t.id)
                return (
                  <div key={t.id}
                    className={`flex items-center gap-3 px-4 py-[12px] transition-colors ${i < playlist.length - 1 ? 'border-b border-[#f2f2f2]' : ''} ${active && !editMode ? 'bg-[#f9f9f9]' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => editMode ? toggleSelect(t.id) : playIndex(i)}>

                    {/* Edit mode: checkbox; Normal mode: play button */}
                    {editMode ? (
                      <div className={`w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-[#ccc]'}`}>
                        {isSelected && <Check className="w-[13px] h-[13px] text-white" strokeWidth={2.5} />}
                      </div>
                    ) : (
                      <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all"
                        style={{ background: active ? '#1a1a1a' : '#f0f0f0' }}>
                        {playing
                          ? <Pause className="w-[13px] h-[13px] text-white" fill="white" strokeWidth={0} />
                          : <Play className={`w-[13px] h-[13px] translate-x-[1px]`} fill={active ? 'white' : '#bbb'} strokeWidth={0} style={{ color: active ? 'white' : '#bbb' }} />}
                      </div>
                    )}

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${active && !editMode ? 'font-bold text-[#1a1a1a]' : 'font-medium text-[#333]'}`}>{t.name}</p>
                      <p className="text-[11px] text-[#aaa] truncate">{t.artist}</p>
                    </div>

                    {/* Single delete (non-edit mode) */}
                    {!editMode && (
                      <button onClick={(e) => { e.stopPropagation(); removeTrack(t.id); if (active && isPlaying) setIsPlaying(false) }}
                        className="shrink-0 active:opacity-60 p-1">
                        <Trash2 className="w-[15px] h-[15px] text-[#ddd]" strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
