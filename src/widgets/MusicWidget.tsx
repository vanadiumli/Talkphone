import { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Heart, AlignJustify, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { usePhoneStore } from '../store/phoneStore'

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type PlayMode = 'seq' | 'shuffle' | 'repeatAll' | 'repeatOne'

export default function MusicWidget() {
  const { playlist, currentTrackIndex, isPlaying, setIsPlaying, setCurrentTrack, updateTrack, openApp } = usePhoneStore()
  const track = playlist[currentTrackIndex] ?? null
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playMode, setPlayMode] = useState<PlayMode>('seq')
  const playModeRef = useRef<PlayMode>('seq')
  const loadedSrcRef = useRef<string>('')
  const rafRef = useRef<number>(0)

  // Duration: prefer track.duration (from decodeAudioData), fallback to audio element
  const [audioDuration, setAudioDuration] = useState(0)
  const duration = (track?.duration ?? 0) > 0 ? (track?.duration ?? 0) : audioDuration

  const handleEnded = useCallback(() => {
    const state = usePhoneStore.getState()
    const len = state.playlist.length
    if (!len) return
    const cur = state.currentTrackIndex
    const mode = playModeRef.current
    if (mode === 'repeatOne') {
      const audio = audioRef.current
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}) }
      return
    }
    if (mode === 'shuffle') { state.setCurrentTrack(Math.floor(Math.random() * len)); return }
    const next = cur + 1
    if (next >= len) { if (mode === 'repeatAll') state.setCurrentTrack(0); else state.setIsPlaying(false) }
    else state.setCurrentTrack(next)
  }, [])

  // RAF-based time updater — more reliable than ontimeupdate which can stop firing
  const updateTime = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime)
      const d = audio.duration
      if (isFinite(d) && d > 0) setAudioDuration(d)
    }
    rafRef.current = requestAnimationFrame(updateTime)
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio
    audio.preload = 'auto'
    audio.onended = handleEnded
    audio.onerror = () => { console.warn('Audio error', audio.error) }

    // Start RAF loop for smooth progress updates
    rafRef.current = requestAnimationFrame(updateTime)

    return () => {
      cancelAnimationFrame(rafRef.current)
      audio.pause()
      audio.src = ''
      audio.onended = null
      audio.onerror = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { playModeRef.current = playMode }, [playMode])

  // Load track source when track changes (by id, not just index)
  const trackBlobUrl = track?.blobUrl ?? ''
  const trackId = track?.id ?? ''
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!trackBlobUrl) {
      audio.pause(); audio.src = ''; loadedSrcRef.current = ''
      setCurrentTime(0); setAudioDuration(0)
      return
    }
    // Only reload if the source actually changed
    if (loadedSrcRef.current === trackBlobUrl) return
    loadedSrcRef.current = trackBlobUrl
    audio.pause()
    setCurrentTime(0); setAudioDuration(0)
    audio.src = trackBlobUrl
    audio.load()
    // Auto-play if isPlaying is true
    if (usePhoneStore.getState().isPlaying) {
      audio.play().catch(() => usePhoneStore.getState().setIsPlaying(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackBlobUrl, trackId])

  // Play/pause when isPlaying changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !trackBlobUrl) return
    // Ensure source is loaded
    if (audio.src !== trackBlobUrl && !audio.src.startsWith('blob:')) {
      // src may be a different representation; check loaded ref
      if (loadedSrcRef.current !== trackBlobUrl) {
        audio.src = trackBlobUrl
        audio.load()
        loadedSrcRef.current = trackBlobUrl
      }
    }
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, trackBlobUrl, setIsPlaying])

  // Backfill track.duration if we detected it via audio element
  useEffect(() => {
    if (track && track.duration <= 0 && audioDuration > 0) {
      updateTrack(track.id, { duration: audioDuration })
    }
  }, [audioDuration, track, updateTrack])

  function skipPrev() {
    if (!playlist.length) return
    if (currentTime > 3 && audioRef.current) { audioRef.current.currentTime = 0; return }
    if (playMode === 'shuffle') { setCurrentTrack(Math.floor(Math.random() * playlist.length)); return }
    setCurrentTrack((currentTrackIndex - 1 + playlist.length) % playlist.length)
  }

  function skipNext() {
    if (!playlist.length) return
    if (playMode === 'shuffle') { setCurrentTrack(Math.floor(Math.random() * playlist.length)); return }
    setCurrentTrack((currentTrackIndex + 1) % playlist.length)
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const audio = audioRef.current
    if (!audio || duration <= 0) return
    audio.currentTime = duration * ratio
    setCurrentTime(duration * ratio)
  }

  function cycleMode() {
    setPlayMode((m) => m === 'seq' ? 'shuffle' : m === 'shuffle' ? 'repeatAll' : m === 'repeatAll' ? 'repeatOne' : 'seq')
  }

  const ModeIcon = playMode === 'shuffle' ? Shuffle : playMode === 'repeatOne' ? Repeat1 : Repeat
  const modeActive = playMode !== 'seq'
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0
  const remaining = Math.max(0, duration - currentTime)
  const hasDuration = duration > 0

  return (
    <div className="col-span-2 px-[16px] pt-[14px] pb-[12px]">
      <div className="flex items-baseline justify-between gap-2 mb-[10px]">
        <p className="text-[13px] font-semibold text-[#1a1a1a] truncate leading-tight flex-1 min-w-0">
          {track?.name ?? '暂无音乐'}
        </p>
        <p className="text-[11px] text-[#1a1a1a] shrink-0 leading-tight">
          {track ? track.artist : '—'}
        </p>
      </div>

      <div className="px-[4px] mb-[5px]">
        <div className="relative h-[2px] bg-black/[0.1] rounded-full cursor-pointer" style={{ overflow: 'visible' }}
          onClick={handleProgressClick}>
          <div className="absolute left-0 top-0 h-full bg-[#1a1a1a] rounded-full"
            style={{ width: `${progress * 100}%`, transition: 'none' }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] bg-[#1a1a1a] rounded-full translate-x-1/2" />
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[9.5px] text-[#c0c0c0] mb-[12px] tabular-nums px-[4px]">
        <span>{fmtTime(currentTime)}</span>
        <span>{hasDuration ? `-${fmtTime(remaining)}` : '--:--'}</span>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={(e) => { e.stopPropagation(); track && updateTrack(track.id, { liked: !track.liked }) }}
          disabled={!track} className="active:opacity-50 disabled:opacity-20 p-[2px]">
          <Heart className="w-[16px] h-[16px]"
            style={{ color: track?.liked ? '#ff4d6d' : '#1a1a1a', fill: track?.liked ? '#ff4d6d' : 'none' }}
            strokeWidth={1.8} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); skipPrev() }}
          disabled={!track} className="active:opacity-50 disabled:opacity-20 p-[2px]">
          <SkipBack className="w-[18px] h-[18px] text-[#1a1a1a]" strokeWidth={1.6} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); track && setIsPlaying(!isPlaying) }}
          disabled={!track} className="active:opacity-50 disabled:opacity-20 p-[2px] transition-opacity">
          {isPlaying
            ? <Pause className="w-[22px] h-[22px] text-[#1a1a1a]" fill="#1a1a1a" strokeWidth={0} />
            : <Play className="w-[22px] h-[22px] text-[#1a1a1a] translate-x-[1px]" fill="#1a1a1a" strokeWidth={0} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); skipNext() }}
          disabled={!track} className="active:opacity-50 disabled:opacity-20 p-[2px]">
          <SkipForward className="w-[18px] h-[18px] text-[#1a1a1a]" strokeWidth={1.6} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); cycleMode() }}
          className="active:opacity-50 p-[2px]">
          <ModeIcon className="w-[16px] h-[16px]"
            style={{ color: modeActive ? '#1a1a1a' : '#c0c0c0' }} strokeWidth={1.8} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); openApp('music') }}
          className="active:opacity-50 p-[2px]">
          <AlignJustify className="w-[16px] h-[16px] text-[#1a1a1a]" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
