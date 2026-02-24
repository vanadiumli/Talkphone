import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Edit3, Trash2,
  MessageCircle, Users, UserCircle, Phone, Smile, Mic,
  MoreVertical, ImagePlus, Brain, Tag, Camera, ArrowUp,
  PinIcon, EyeOff, Eye, Banknote, Copy, RotateCcw, Undo2, Quote, Share2, Heart, Volume2,
} from 'lucide-react'
import { usePhoneStore, buildCharPersona, buildMaskDescription, buildMemoryPrompt, getCharMemory, type AIChar, type UserMask, type Conversation, type ConvMessage, type DialogExample, type MemoryChunk, type Moment } from '../store/phoneStore'

/** Web Speech API (Chrome); not in TS DOM lib */
interface SpeechRecognitionLike {
  start(): void
  stop(): void
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string }; length: number }[] }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}


type Tab = 'chats' | 'contacts' | 'friends' | 'me'
type Filter = 'all' | 'unread' | 'groups' | 'single'

/* ─── Page pop hook (slide-out animation before calling onBack) ─── */
function usePagePop(onBack: () => void) {
  const [popping, setPopping] = useState(false)
  const pop = useCallback(() => { setPopping(true); setTimeout(onBack, 260) }, [onBack])
  return { popping, pop }
}

/* ─── FormRow (module-level to prevent re-mount on parent state change) ─── */
function FormRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center px-4 py-[11px] border-b border-ios-bg last:border-b-0">
      <span className="text-[12px] font-bold text-ios-text-secondary w-[52px] shrink-0">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? ''}
        className="flex-1 bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30 text-right" />
    </div>
  )
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/* ─── Avatar ─── */
function Avatar({ src, size = 46, online }: { src: string; size?: number; online?: boolean }) {
  const isEmoji = /^\p{Emoji}/u.test(src) && src.length <= 8
  return (
    <div className="relative shrink-0">
      {isEmoji ? (
        <div className="rounded-full bg-[#f0f0f0] flex items-center justify-center"
          style={{ width: size, height: size, fontSize: size * 0.46 }}>
          {src}
        </div>
      ) : (
        <img src={src} alt="" className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size }} />
      )}
      {online && <div className="absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full bg-[#25D366] border-[2px] border-white" />}
    </div>
  )
}

/* ─── Group Avatar (2×2 grid of member avatars) ─── */
function GroupAvatar({ avatars, size = 50 }: { avatars: string[]; size?: number }) {
  const list = avatars.slice(0, 4)
  if (list.length <= 1) return <Avatar src={list[0] ?? '👥'} size={size} />
  const mini = Math.floor((size - 6) / 2)
  const radius = Math.round(size * 0.22)
  return (
    <div className="relative shrink-0 bg-[#e5e5ea] overflow-hidden"
      style={{ width: size, height: size, borderRadius: radius, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 2 }}>
      {list.map((av, i) => {
        const isEmoji = /^\p{Emoji}/u.test(av) && av.length <= 8
        return isEmoji ? (
          <div key={i} className="rounded-full bg-[#d4d4d8] flex items-center justify-center"
            style={{ width: mini, height: mini, fontSize: mini * 0.46 }}>{av}</div>
        ) : (
          <img key={i} src={av} alt="" className="rounded-full object-cover"
            style={{ width: mini, height: mini }} />
        )
      })}
    </div>
  )
}

/* ─── Emoji data ─── */
const EMOJI_GROUPS = [
  { label: '😊', name: '笑脸', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  { label: '👍', name: '手势', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄'] },
  { label: '❤️', name: '爱心', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','❤️‍🩹','💔','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','♾️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','💋','💯','💢','💥','💫','💦','💨','🕳️','💬','💭','💤'] },
  { label: '🌸', name: '自然', emojis: ['🌸','🌺','🌻','🌹','🌷','🌼','💐','🌿','☘️','🍀','🎋','🎍','🌱','🌲','🌳','🌴','🍄','🌾','💧','🌊','🌀','🌈','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈️','🌩','🌨','❄️','☃️','⛄','🌬','💨','🌪','🌫','🌊','🌙','⭐','🌟','💫','✨','☄️','🔥','🌻','🍁','🍂','🍃'] },
  { label: '🎉', name: '活动', emojis: ['🎉','🎊','🎈','🎁','🎀','🎗','🎟','🎫','🏆','🥇','🥈','🥉','🏅','🎖','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🎸','🎺','🎻','🥁','🎲','🧩','🎮','🎯','🎳','🏹','🎣','🤿','🏄','🏊','🚵','🧗','🏋️','🤼','🤸','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥏','🎱','🏓','🏸'] },
]

/* ─── All Emoji combined into one flat array for the single "emoji" tab ─── */
const ALL_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.emojis)

/* ─── Emoji Picker ─── */
function EmojiPicker({ onSelect, onSendSticker, visible }: {
  onSelect: (emoji: string) => void
  onSendSticker: (url: string) => void
  visible: boolean
}) {
  const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji')
  const { customStickers, addCustomSticker, removeCustomSticker } = usePhoneStore()
  const stickerRef = useRef<HTMLInputElement>(null)

  function handleStickerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach((f) => {
      const r = new FileReader()
      r.onload = () => addCustomSticker(r.result as string)
      r.readAsDataURL(f)
    })
    e.target.value = ''
  }

  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
      {/* Two tabs: emoji / sticker */}
      <div className="flex border-b border-black/[0.06] px-1">
        <button onClick={() => setTab('emoji')}
          className={`flex-1 py-[8px] text-[13px] font-bold text-center transition-colors ${tab === 'emoji' ? 'text-[#25D366] border-b-2 border-[#25D366]' : 'text-[#aaa]'}`}>
          表情
        </button>
        <button onClick={() => setTab('sticker')}
          className={`flex-1 py-[8px] text-[13px] font-bold text-center transition-colors ${tab === 'sticker' ? 'text-[#25D366] border-b-2 border-[#25D366]' : 'text-[#aaa]'}`}>
          贴图
        </button>
      </div>

      <div className="h-[180px] overflow-y-auto scrollbar-none p-2">
        {tab === 'sticker' ? (
          <div>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {customStickers.map((url, i) => (
                <div key={i} className="relative group">
                  <button onClick={() => onSendSticker(url)} className="w-full aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-[8px]" />
                  </button>
                  <button onClick={() => removeCustomSticker(i)}
                    className="absolute top-[-4px] right-[-4px] w-[16px] h-[16px] rounded-full bg-red-500 text-white hidden group-active:flex items-center justify-center text-[9px]">✕</button>
                </div>
              ))}
              <button onClick={() => stickerRef.current?.click()}
                className="w-full aspect-square rounded-[8px] bg-black/[0.04] flex items-center justify-center active:opacity-70">
                <Plus className="w-5 h-5 text-[#bbb]" />
              </button>
            </div>
            <input ref={stickerRef} type="file" accept="image/*" multiple className="hidden" onChange={handleStickerUpload} />
            {customStickers.length === 0 && (
              <p className="text-[12px] text-center text-[#bbb] mt-4">点击 + 导入你的表情包</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {ALL_EMOJIS.map((e, i) => (
              <button key={i} onClick={() => onSelect(e)}
                className="text-[22px] leading-none p-[3px] rounded-[6px] active:bg-black/[0.06]">{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Extra Options Sheet (+ button menu) ─── */
function ExtraOptionsSheet({ onClose, onTransfer, visible }: { onClose: () => void; onTransfer: () => void; visible: boolean }) {
  return (
    <div className="absolute inset-0 z-[15] flex flex-col justify-end"
      onClick={onClose}
      style={{ transition: 'opacity 0.22s ease', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="px-4 pb-[44px] pt-4"
        style={{
          background: 'rgba(242,242,247,0.96)', backdropFilter: 'blur(30px)', boxShadow: '0 -0.5px 0 rgba(0,0,0,0.08)',
          transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
        }}>
        <div className="w-[36px] h-[4px] rounded-full bg-[#ccc] mx-auto mb-5" />
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => { onTransfer(); onClose() }}
            className="flex flex-col items-center gap-[7px] active:opacity-60">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-white flex items-center justify-center"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)' }}>
              <Banknote className="w-[22px] h-[22px] text-[#3a7d44]" strokeWidth={1.6} />
            </div>
            <span className="text-[11px] font-medium text-[#555]">转账</span>
          </button>
          <button onClick={onClose}
            className="flex flex-col items-center gap-[7px] active:opacity-60">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-white flex items-center justify-center"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)' }}>
              <ImagePlus className="w-[22px] h-[22px] text-[#5c7cfa]" strokeWidth={1.6} />
            </div>
            <span className="text-[11px] font-medium text-[#555]">图片</span>
          </button>
          <button onClick={onClose}
            className="flex flex-col items-center gap-[7px] active:opacity-60">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-white flex items-center justify-center"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)' }}>
              <Camera className="w-[22px] h-[22px] text-[#888]" strokeWidth={1.6} />
            </div>
            <span className="text-[11px] font-medium text-[#555]">相机</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Transfer Modal ─── */
function TransferModal({ charName, onSend, onClose }: { charName: string; onSend: (amount: number, note: string) => void; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const num = parseFloat(amount)
  const valid = !isNaN(num) && num > 0 && num <= 50000

  return (
    <div className="absolute inset-0 z-[20] flex flex-col justify-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-[#FA8714] rounded-t-[20px] px-5 pt-5 pb-[40px]"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="text-white/80 active:opacity-60"><X className="w-5 h-5" /></button>
          <p className="text-white font-bold text-[16px] flex-1 text-center">转账给 {charName}</p>
        </div>
        <div className="bg-white/10 rounded-[14px] px-4 py-3 mb-3 flex items-center">
          <span className="text-white text-[22px] font-bold mr-2">¥</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00" type="number" min="0" max="50000" step="0.01"
            className="flex-1 bg-transparent text-white text-[28px] font-bold outline-none placeholder:text-white/40"
            autoFocus />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="转账说明（选填）"
          className="w-full bg-white/10 rounded-[14px] px-4 py-3 text-white text-[14px] outline-none placeholder:text-white/50 mb-4" />
        <button onClick={() => { if (valid) { onSend(num, note); onClose() } }}
          disabled={!valid}
          className="w-full bg-white rounded-[14px] py-[14px] text-[#FA8714] text-[16px] font-bold active:opacity-80 disabled:opacity-40">
          确认转账
        </button>
      </div>
    </div>
  )
}

/* ─── Transfer Card (in message bubble) ─── */
function TransferCard({ msg, isUser, onAccept }: { msg: ConvMessage; isUser: boolean; onAccept?: () => void }) {
  return (
    <div className="rounded-[14px] overflow-hidden min-w-[168px]"
      style={{ background: 'linear-gradient(135deg, #FA8714 0%, #e07200 100%)', boxShadow: '0 2px 8px rgba(250,135,20,0.35)' }}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="w-5 h-5 text-white/90" />
          <span className="text-white text-[13px] font-bold">{isUser ? '你发送了' : '收到'}转账</span>
        </div>
        <p className="text-white text-[26px] font-bold leading-tight">¥{msg.transferAmount?.toFixed(2)}</p>
        {msg.transferNote && <p className="text-white/70 text-[12px] mt-1">{msg.transferNote}</p>}
      </div>
      <div className="border-t border-white/20 px-4 py-[10px]">
        {msg.transferAccepted ? (
          <p className="text-white/70 text-[12px] font-bold">已领取</p>
        ) : isUser ? (
          <p className="text-white/70 text-[12px]">等待对方领取</p>
        ) : (
          <button onClick={onAccept} className="text-white text-[13px] font-bold active:opacity-70">
            领取 →
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Conversation Settings Sub-page ─── */
function ConvSettings({ conv, onBack }: { conv: Conversation; onBack: () => void }) {
  const { chars, updateConversation, clearConversationMessages, removeConversation } = usePhoneStore()
  const { popping, pop } = usePagePop(onBack)
  const convChars = conv.charIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean) as import('../store/phoneStore').AIChar[]
  const mainChar = convChars[0]
  const isGroup = conv.isGroup
  const [nickname, setNickname] = useState(conv.nickname ?? '')
  const [editingNick, setEditingNick] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'clear' | 'delete' | null>(null)
  const [editingChar, setEditingChar] = useState<import('../store/phoneStore').AIChar | null>(null)
  const [editingCharShowPreview, setEditingCharShowPreview] = useState(false)
  const bgRef = useRef<HTMLInputElement>(null)
  const memoryDays = conv.messages.filter((m) => m.role === 'assistant').length
  const autoName = isGroup ? convChars.map((c) => c.name).join('、') : (mainChar?.name ?? '')

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => updateConversation(conv.id, { background: r.result as string })
    r.readAsDataURL(file); e.target.value = ''
  }

  // Inline confirm banner
  function ConfirmBanner({ label, onConfirm }: { label: string; onConfirm: () => void }) {
    return (
      <div className="px-4 py-[10px] bg-red-50 flex items-center gap-3">
        <p className="flex-1 text-[13px] font-medium text-red-600">{label}</p>
        <button onClick={() => setConfirmAction(null)} className="px-3 py-[5px] rounded-[8px] bg-[#f0f0f0] text-[12px] font-bold text-[#555] active:opacity-70">取消</button>
        <button onClick={() => { onConfirm(); setConfirmAction(null) }} className="px-3 py-[5px] rounded-[8px] bg-red-500 text-white text-[12px] font-bold active:opacity-70">确定</button>
      </div>
    )
  }

  return (
    <div className={`absolute inset-0 z-30 bg-ios-bg flex flex-col ${popping ? 'animate-page-pop' : 'animate-page-push'}`}>
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={pop} className="text-[#25D366] active:opacity-60"><ChevronLeft className="w-7 h-7" /></button>
        <h1 className="text-[16px] font-bold text-ios-text flex-1 text-center pr-[28px]">{isGroup ? '群聊设置' : '聊天设置'}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">

        {/* Top card */}
        <div className="bg-card rounded-[16px] p-4 flex flex-col items-center mb-5">
          {isGroup
            ? <GroupAvatar avatars={convChars.map((c) => c.avatar)} size={60} />
            : mainChar && <Avatar src={mainChar.avatar} size={56} />
          }
          <p className="text-[15px] font-bold text-ios-text mt-2">{conv.nickname || autoName}</p>
          {isGroup && <p className="text-[11px] text-ios-text-secondary mt-[2px]">{convChars.length} 位成员</p>}
          {!isGroup && conv.nickname && <p className="text-[11px] text-ios-text-secondary">{mainChar?.name}</p>}
        </div>

        {/* Group members (clickable → open CharForm) */}
        {(isGroup || mainChar) && (
          <>
            <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">
              {isGroup ? '群成员' : '角色信息'}
            </p>
            <div className="bg-card rounded-[14px] overflow-hidden mb-5">
              {convChars.map((c, i) => (
                <button key={c.id} onClick={() => { setEditingChar(c); setEditingCharShowPreview(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-[11px] active:bg-ios-bg/50 transition-colors ${i < convChars.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                  <Avatar src={c.avatar} size={36} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-medium text-ios-text">{c.name}</p>
                    {c.corePrompt && <p className="text-[11px] text-[#25D366]">✓ 已整理</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-ios-text-secondary/40 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">{isGroup ? '群聊' : '对话'}</p>
        <div className="bg-card rounded-[14px] overflow-hidden mb-5">
          {/* Group name / Nickname */}
          <div className={`px-4 py-[13px] ${editingNick ? '' : 'flex items-center'} border-b border-ios-bg`}>
            {editingNick ? (
              <div>
                <p className="text-[11px] font-bold text-ios-text-secondary mb-2">{isGroup ? '群聊名称' : '昵称'}</p>
                <div className="flex gap-2">
                  <input autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)}
                    placeholder={autoName}
                    className="flex-1 bg-ios-bg rounded-[10px] px-3 py-[7px] text-[13px] font-medium text-ios-text outline-none" />
                  <button onClick={() => { updateConversation(conv.id, { nickname: nickname.trim() || undefined }); setEditingNick(false) }}
                    className="bg-[#25D366] text-white rounded-[10px] px-3 text-[12px] font-bold active:opacity-80">保存</button>
                  <button onClick={() => setEditingNick(false)}
                    className="bg-ios-bg rounded-[10px] px-3 text-[12px] font-bold text-ios-text-secondary active:opacity-80">取消</button>
                </div>
              </div>
            ) : (
              <>
                <Tag className="w-[14px] h-[14px] text-[#888] mr-3 shrink-0" />
                <span className="text-[14px] font-medium text-ios-text flex-1">{isGroup ? '群聊名称' : '昵称'}</span>
                <span className="text-[13px] text-ios-text-secondary mr-2 truncate max-w-[120px]">{conv.nickname || '未设置'}</span>
                <button onClick={() => setEditingNick(true)} className="text-[#25D366] active:opacity-60 shrink-0"><Edit3 className="w-4 h-4" /></button>
              </>
            )}
          </div>
          {/* Background */}
          <div className="flex items-center px-4 py-[13px] border-b border-ios-bg">
            <ImagePlus className="w-[14px] h-[14px] text-[#888] mr-3 shrink-0" />
            <span className="text-[14px] font-medium text-ios-text flex-1">聊天背景</span>
            {conv.background ? (
              <div className="flex items-center gap-2">
                <img src={conv.background} alt="" className="w-[26px] h-[26px] rounded-[6px] object-cover" />
                <button onClick={() => bgRef.current?.click()} className="text-[12px] text-[#25D366] font-bold">更换</button>
                <button onClick={() => updateConversation(conv.id, { background: undefined })} className="text-red-400 active:opacity-60"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => bgRef.current?.click()} className="text-[12px] text-[#25D366] font-bold active:opacity-60">设置</button>
            )}
            <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </div>
          {/* Memory count */}
          <div className="flex items-center px-4 py-[13px]">
            <Brain className="w-[14px] h-[14px] text-[#888] mr-3 shrink-0" />
            <span className="text-[14px] font-medium text-ios-text flex-1">对话记录</span>
            <span className="text-[13px] text-ios-text-secondary">{memoryDays} 条</span>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-card rounded-[14px] overflow-hidden mb-4">
          {confirmAction === 'clear' ? (
            <ConfirmBanner label="清空后无法恢复，确认吗？" onConfirm={() => clearConversationMessages(conv.id)} />
          ) : (
            <button onClick={() => setConfirmAction('clear')}
              className="w-full px-4 py-[13px] text-[14px] font-medium text-red-500 text-left active:bg-ios-bg/50 border-b border-ios-bg">
              清空聊天记录
            </button>
          )}
          {confirmAction === 'delete' ? (
            <ConfirmBanner label="对话将彻底消失，确认删除？" onConfirm={() => { removeConversation(conv.id); onBack() }} />
          ) : (
            <button onClick={() => setConfirmAction('delete')}
              className="w-full px-4 py-[13px] text-[14px] font-medium text-red-500 text-left active:bg-ios-bg/50">
              删除对话
            </button>
          )}
        </div>
      </div>

      {/* CharForm sub-page */}
      {editingChar && <CharForm char={editingChar} onBack={() => { setEditingChar(null); setEditingCharShowPreview(false) }} initialShowPreview={editingCharShowPreview} />}
    </div>
  )
}

/* ─── Shared AI constraints (applied to all chat requests) ─── */
// ── AI reply helpers ──

/** Strip <think>…</think>, extract <reply>…</reply>, split by ||| */
interface ParsedReply { parts: string[] }

function parseAIReply(raw: string): ParsedReply {
  let text = raw.trim()
  // Extract <reply>...</reply> if present
  const replyMatch = text.match(/<reply>([\s\S]*?)<\/reply>/i)
  if (replyMatch) {
    text = replyMatch[1].trim()
  } else {
    // Strip <think>...</think> blocks only — keep everything else as-is
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    // Only strip <reply> and </reply> tags themselves (not other XML)
    text = text.replace(/<\/?reply>/gi, '').trim()
  }

  // Strip accidental [quote:...] at the start
  text = text.replace(/^\[quote:[^\]]{0,100}\]\s*/i, '').trim()

  let parts: string[]
  if (text.includes('|||')) {
    parts = text.split(/\s*\|\|\|\s*/).map((s) => s.trim()).filter(Boolean)
  } else {
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)
    parts = lines.length > 0 ? lines : (text ? [text] : [])
  }
  parts = parts.filter((s) => s.trim().length > 0)
  if (parts.length === 0) parts = ['…']
  return { parts }
}

/** If text is purely [sticker:EMOJI], return the emoji string; else null */
function isStickerText(text: string): string | null {
  const m = text.trim().match(/^\[sticker:(.+?)\]$/)
  return m ? m[1] : null
}

/** Inline-replace [sticker:emoji] occurrences in text with the raw emoji */
function expandStickers(text: string): string {
  return text.replace(/\[sticker:([^\]]+)\]/g, '$1')
}

/* ─── Chat Conversation ─── */
function ChatConversation({ convId, onBack }: { convId: string; onBack: () => void }) {
  const store = usePhoneStore()
  const { conversations, chars, userMasks, apiSettings, cloneVoiceSettings, wallpaper, worldBooks, addMessage, updateMessage, removeMessage } = store
  const conv = conversations.find((c) => c.id === convId)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [groupLoadingCharId, setGroupLoadingCharId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [ctxMsg, setCtxMsg] = useState<ConvMessage | null>(null)
  const [peeking, setPeeking] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [quotedMsg, setQuotedMsg] = useState<ConvMessage | null>(null)
  const [forwardingMsg, setForwardingMsg] = useState<ConvMessage | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [playingVoiceMsgId, setPlayingVoiceMsgId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceResultRef = useRef<string>('')
  const cloneVoiceAudioRef = useRef<HTMLAudioElement | null>(null)

  if (!conv) { onBack(); return null }
  const char = chars.find((c) => c.id === conv.charIds[0])
  const convChars = conv.charIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean) as import('../store/phoneStore').AIChar[]
  const mask = userMasks.find((m) => m.id === conv.maskId)
  const messages = conv.messages
  const isGroup = conv.isGroup
  const groupName = conv.nickname || convChars.map((c) => c.name).join('、')

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60)
  }, [messages.length])

  function startLongPress(msg: ConvMessage) {
    lpTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(12)
      setCtxMsg(msg)
    }, 550)
  }
  function cancelLongPress() {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null }
  }

  function reactToMsg(emoji: string) {
    if (!ctxMsg || !conv) return
    const current = ctxMsg.reactions ?? []
    const next = current.includes(emoji) ? current.filter((e) => e !== emoji) : [...current, emoji]
    updateMessage(conv.id, ctxMsg.id, { reactions: next })
    setCtxMsg(null)
  }

  function unsendMsg(msg: ConvMessage) {
    if (!conv) return
    updateMessage(conv.id, msg.id, { unsent: true, unsentText: msg.text, text: '' })
    addMessage(conv.id, { role: 'assistant', time: nowTime(), text: '你撤回了什么？让我猜猜…' })
    setCtxMsg(null)
  }

  async function resendMsg(msg: ConvMessage) {
    if (!conv || !char) return
    removeMessage(conv.id, msg.id)
    setCtxMsg(null)
    setLoading(true)
    try {
      const targetChar = (isGroup && msg.charId) ? (convChars.find((c) => c.id === msg.charId) ?? char) : char
      const history = messages.filter((m) => m.id !== msg.id).slice(-16)
      const rawText = await callCharAPI(targetChar, [], history, isGroup)
      const { parts } = parseAIReply(rawText)
      setLoading(false)
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) { setLoading(true); await new Promise((r) => setTimeout(r, 350 + Math.random() * 400)); setLoading(false) }
        const stickerEmoji = isStickerText(parts[i])
        addMessage(conv.id, { text: stickerEmoji ? parts[i] : expandStickers(parts[i]), time: nowTime(), role: 'assistant', charId: targetChar.id })
      }
    } catch { setLoading(false) }
  }

  function buildTimePrompt() {
    const now = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    return `【当前时间】${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}
根据这个时间判断自己现在应该在做什么（睡觉/起床/上班/吃饭/发呆等），并自然地融入到对话状态中。`
  }

  async function callCharAPI(gc: AIChar, extraSystemParts: string[], historyMsgs: ConvMessage[], groupMode = false) {
    const systemParts = [buildCharPersona(gc.name, gc)]
    if (mask?.description) systemParts.push(`【用户身份设定】\n${mask.description}`)
    systemParts.push(buildTimePrompt())
    // 世界书：对话绑定的世界书或全部，作为世界设定注入
    const wbIds = conv?.worldBookIds?.length ? conv.worldBookIds : worldBooks.map((w) => w.id)
    const wbContent = worldBooks.filter((w) => wbIds.includes(w.id)).map((w) => w.content).filter(Boolean).join('\n\n')
    if (wbContent) systemParts.push(`【世界设定】\n${wbContent}`)
    // 记忆：按角色独立读取
    const charMemory = conv ? getCharMemory(conv, gc.id) : null
    const memoryParts = charMemory ? buildMemoryPrompt(gc.name, charMemory, conv?.relationshipStage ?? 0, gc, historyMsgs) : []
    systemParts.push(...memoryParts)
    systemParts.push(...extraSystemParts)
    // Build history — in group mode use invisible metadata prefix so AI knows who said what
    // but NEVER copies the prefix into its own reply
    const history = historyMsgs.map((m) => {
      if (m.role === 'assistant' && groupMode && m.charId) {
        const sender = convChars.find((c) => c.id === m.charId)
        // Use ⟨name⟩ angle-bracket style — looks clearly like metadata, not reply content
        const prefix = sender ? `⟨${sender.name}⟩ ` : ''
        if (m.type === 'sticker' && m.stickerUrl) return { role: 'assistant' as const, content: `${prefix}[发了一张表情图]` }
        const text = isStickerText(m.text) ? `${prefix}[sticker:${isStickerText(m.text)}]` : `${prefix}${m.text}`
        return { role: 'assistant' as const, content: text }
      }
      if (m.type === 'transfer') return { role: m.role, content: `[转账 ¥${m.transferAmount}，备注：${m.transferNote || '无'}]` }
      if (m.type === 'sticker' && m.stickerUrl) return { role: m.role, content: '[发了一张表情图]' }
      return { role: m.role, content: m.text }
    })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(`${apiSettings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiSettings.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: apiSettings.model || 'gpt-3.5-turbo',
          temperature: apiSettings.temperature ?? 0.9,
          messages: [{ role: 'system', content: systemParts.join('\n\n') }, ...history],
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        throw new Error(`API ${res.status}：${errText.slice(0, 80)}`)
      }
      const data = await res.json()
      const choice = data.choices?.[0]
      const content = choice?.message?.content
      if (content && typeof content === 'string' && content.trim()) return content
      const rc = choice?.message?.reasoning_content
      if (rc && typeof rc === 'string' && rc.trim()) return rc
      // Content is empty — return a fallback instead of throwing
      // (Some API proxies consume reasoning tokens but fail to output visible content)
      return '…'
    } finally {
      clearTimeout(timeout)
    }
  }

  function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
    if (typeof window === 'undefined') return null
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }

  function startVoiceInput() {
    setVoiceError(null)
    voiceResultRef.current = ''
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setVoiceError('当前浏览器不支持语音输入，请使用 Chrome')
      return
    }
    const rec = speechRecognitionRef.current
    if (rec) {
      try { rec.stop() } catch { /* ignore */ }
      speechRecognitionRef.current = null
    }
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) voiceResultRef.current += e.results[i][0].transcript
      }
    }
    recognition.onerror = (e) => {
      const err = (e as { error?: string })?.error
      const msg = err === 'not-allowed' ? '请允许麦克风权限'
        : err === 'no-speech' ? '没检测到说话，请重试'
        : err === 'network' ? '网络异常，请检查后重试'
        : err === 'audio-capture' ? '无法使用麦克风'
        : err ? `识别出错：${err}` : '识别出错，请重试'
      setVoiceError(msg)
    }
    recognition.onend = () => { speechRecognitionRef.current = null; setIsRecordingVoice(false) }
    speechRecognitionRef.current = recognition
    setIsRecordingVoice(true)
    try {
      recognition.start()
    } catch (err) {
      setVoiceError('无法启动麦克风')
      setIsRecordingVoice(false)
    }
  }

  function stopVoiceInput() {
    const rec = speechRecognitionRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch { /* ignore */ }
    speechRecognitionRef.current = null
    setIsRecordingVoice(false)
    const text = (voiceResultRef.current || '').trim()
    if (text && !loading) {
      setInput('')
      const captured = quotedMsg
      setQuotedMsg(null)
      const userMsg: Partial<ConvMessage> = {}
      let quoteExtra: string[] = []
      if (captured) {
        const senderName = captured.role === 'user' ? '你' : (convChars.find(c => c.id === captured.charId)?.name ?? char?.name ?? 'Ta')
        userMsg.quotedText = captured.text.slice(0, 80)
        userMsg.quotedSenderName = senderName
        quoteExtra = [`用户引用了${senderName}的这句话「${captured.text.slice(0, 60)}」在回复`]
      }
      addMessage(convId, { text, time: nowTime(), role: 'user', ...userMsg })
      if (apiSettings.baseUrl && apiSettings.apiKey) {
        if (isGroup) {
          sendGroupMessages(text, quoteExtra)
        } else {
          sendSingleMessage(text, quoteExtra)
        }
      } else {
        addMessage(convId, { text: '请先在设置中配置 API 地址和密钥。', time: nowTime(), role: 'assistant' })
      }
    }
  }

  function hexToBlob(hex: string, contentType: string): Blob | null {
    const hexString = hex.startsWith('0x') ? hex.slice(2) : hex
    if (hexString.length % 2 !== 0) return null
    const bytes = new Uint8Array(hexString.length / 2)
    for (let i = 0; i < hexString.length; i += 2) bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16)
    return new Blob([bytes], { type: contentType })
  }

  async function playCloneVoice(msg: ConvMessage) {
    const msgChar = msg.charId ? convChars.find((c) => c.id === msg.charId) : char
    if (!cloneVoiceSettings.enabled || !cloneVoiceSettings.groupId || !cloneVoiceSettings.apiKey || !msgChar?.cloneVoiceId || !msg?.text?.trim()) return
    const cleanedText = msg.text.replace(/\(.*?\)|（.*?）/g, '').replace(/[\s\u200B-\u200D\uFEFF]/g, ' ').trim()
    if (!cleanedText) return
    if (cloneVoiceAudioRef.current) {
      cloneVoiceAudioRef.current.pause()
      cloneVoiceAudioRef.current = null
    }
    setPlayingVoiceMsgId(msg.id)
    try {
      const res = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${cloneVoiceSettings.groupId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cloneVoiceSettings.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText, model: 'speech-02-hd', voice_setting: { voice_id: msgChar.cloneVoiceId } }),
      })
      const data = await res.json()
      if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
        throw new Error(data.base_resp.status_msg || 'T2A 请求失败')
      }
      const hexAudio = data.data?.audio
      if (!hexAudio) throw new Error('无音频数据')
      const blob = hexToBlob(hexAudio, 'audio/mp3')
      if (!blob) throw new Error('音频解析失败')
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      cloneVoiceAudioRef.current = audio
      audio.onended = () => { setPlayingVoiceMsgId(null); URL.revokeObjectURL(url); cloneVoiceAudioRef.current = null }
      audio.onerror = () => { setPlayingVoiceMsgId(null); URL.revokeObjectURL(url); cloneVoiceAudioRef.current = null }
      await audio.play()
    } catch (e) {
      setPlayingVoiceMsgId(null)
      console.error('克隆音色播放失败:', e)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const captured = quotedMsg
    setQuotedMsg(null)

    const userMsg: Partial<ConvMessage> = {}
    let quoteExtra: string[] = []
    if (captured) {
      const senderName = captured.role === 'user' ? '你' : (convChars.find(c => c.id === captured.charId)?.name ?? char?.name ?? 'Ta')
      userMsg.quotedText = captured.text.slice(0, 80)
      userMsg.quotedSenderName = senderName
      quoteExtra = [`用户引用了${senderName}的这句话「${captured.text.slice(0, 60)}」在回复`]
    }
    addMessage(convId, { text, time: nowTime(), role: 'user', ...userMsg })

    if (!apiSettings.baseUrl || !apiSettings.apiKey) {
      addMessage(convId, { text: '请先在设置中配置 API 地址和密钥。', time: nowTime(), role: 'assistant' }); return
    }
    if (isGroup) {
      await sendGroupMessages(text, quoteExtra)
    } else {
      await sendSingleMessage(text, quoteExtra)
    }
  }

  async function sendSingleMessage(text: string, extraSystemParts: string[] = []) {
    if (!char) return
    setLoading(true)
    try {
      const history = [...messages.slice(-16), { id: '', role: 'user' as const, text, time: nowTime() }]
      const rawText = await callCharAPI(char, extraSystemParts, history)
      const { parts } = parseAIReply(rawText)
      setLoading(false)
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) { setLoading(true); await new Promise((r) => setTimeout(r, 160 + Math.random() * 180)); setLoading(false) }
        const stickerEmoji = isStickerText(parts[i])
        addMessage(convId, {
          text: stickerEmoji ? parts[i] : expandStickers(parts[i]),
          time: nowTime(), role: 'assistant', charId: char.id
        })
      }
    } catch (e) {
      addMessage(convId, { text: `网络错误：${(e as Error).message}`, time: nowTime(), role: 'assistant' })
      setLoading(false)
    }
  }

  async function sendGroupMessages(text: string, extraSystemParts: string[] = []) {
    const allNames = convChars.map((c) => c.name).join('、')
    const mentionedChars = convChars.filter((c) => text.includes(c.name))
    const otherChars = convChars.filter((c) => !mentionedChars.some((m) => m.id === c.id))
    const shuffledOthers = [...otherChars].sort(() => Math.random() - 0.5)
    const respondingChars = mentionedChars.length > 0
      ? [...mentionedChars, ...shuffledOthers.slice(0, Math.random() < 0.35 ? 1 : 0)]
      : [...convChars].sort(() => Math.random() - 0.3)

    for (let ci = 0; ci < respondingChars.length; ci++) {
      const gc = respondingChars[ci]
      setGroupLoadingCharId(gc.id)
      setLoading(true)
      try {
        const freshConv = usePhoneStore.getState().conversations.find((c) => c.id === convId)
        const freshHistory = freshConv?.messages.slice(-16) ?? []
        const historyWithUser = [...freshHistory, { id: '', role: 'user' as const, text, time: nowTime() }]

        const wasMentioned = mentionedChars.some((c) => c.id === gc.id)
        const mentionNote = wasMentioned ? `\n用户的消息直接叫到了你（${gc.name}），你必须回应。注意：中文逗号分隔的是不同意图，如"不要，叫${gc.name}出来"是两层意思。` : ''
        const groupContext = `【群聊情境】群成员：用户、${allNames}（你是${gc.name}）。
你可以：回应用户 / 附和或反驳其他成员 / 只和其他成员聊 / 用[sticker:emoji]做表情反应。${mentionNote}
⚠ 重要：历史消息里的⟨名字⟩前缀是系统标记，仅用于区分发言者。你的<reply>里绝对不要出现任何⟨名字⟩前缀或角色名标签，直接写你要说的话。`

        const rawText = await callCharAPI(gc, [groupContext, ...extraSystemParts], historyWithUser, true)
        const { parts } = parseAIReply(rawText)
        setLoading(false)
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) { setLoading(true); await new Promise((r) => setTimeout(r, 140 + Math.random() * 150)); setLoading(false) }
          const stickerEmoji = isStickerText(parts[i])
          addMessage(convId, {
            text: stickerEmoji ? parts[i] : expandStickers(parts[i]),
            time: nowTime(), role: 'assistant', charId: gc.id
          })
        }
      } catch (e) {
        setLoading(false)
        addMessage(convId, { text: `网络错误：${(e as Error).message?.slice(0, 60) || '请求失败'}`, time: nowTime(), role: 'assistant', charId: gc.id })
      }
      if (ci < respondingChars.length - 1) {
        setLoading(true)
        await new Promise((r) => setTimeout(r, 350 + Math.random() * 400))
        setLoading(false)
      }
    }
    setGroupLoadingCharId(null)
  }

  function sendTransfer(amount: number, note: string) {
    addMessage(convId, { text: '', time: nowTime(), role: 'user', type: 'transfer', transferAmount: amount, transferNote: note })
    // AI responds to receiving transfer
    setTimeout(async () => {
      if (!char || !apiSettings.baseUrl || !apiSettings.apiKey) return
      const responseChar = isGroup ? convChars[Math.floor(Math.random() * convChars.length)] : char
      setLoading(true)
      try {
        const freshConv = usePhoneStore.getState().conversations.find((c) => c.id === convId)
        const h: ConvMessage[] = freshConv?.messages.slice(-20) ?? []
        const rawText = await callCharAPI(responseChar, [], h, isGroup)
        const { parts } = parseAIReply(rawText)
        setLoading(false)
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 300 + Math.random() * 300))
          const stickerEmoji = isStickerText(parts[i])
          addMessage(convId, { text: stickerEmoji ? parts[i] : expandStickers(parts[i]), time: nowTime(), role: 'assistant', charId: responseChar.id })
        }
        if (parts.length > 0) {
          // mark transfer as accepted
          setTimeout(() => {
            const freshConv2 = usePhoneStore.getState().conversations.find((c) => c.id === convId)
            const tMsg = freshConv2?.messages.find((m) => m.type === 'transfer' && !m.transferAccepted)
            if (tMsg) updateMessage(convId, tMsg.id, { transferAccepted: true })
          }, 1500)
        }
      } catch { setLoading(false) }
    }, 800)
  }

  function sendSticker(url: string) {
    addMessage(convId, { text: '', time: nowTime(), role: 'user', type: 'sticker', stickerUrl: url })
    setShowEmoji(false)
    // AI sometimes sends back a sticker
    const { customStickers } = usePhoneStore.getState()
    if (customStickers.length > 0 && Math.random() > 0.6 && char && apiSettings.baseUrl && apiSettings.apiKey) {
      setTimeout(() => {
        const stickerToSend = customStickers[Math.floor(Math.random() * customStickers.length)]
        const responseChar = isGroup ? convChars[Math.floor(Math.random() * convChars.length)] : char
        addMessage(convId, { text: '', time: nowTime(), role: 'assistant', charId: responseChar.id, type: 'sticker', stickerUrl: stickerToSend })
      }, 1200 + Math.random() * 800)
    }
  }

  const chatBg = conv.background || wallpaper
  const glassHeader: React.CSSProperties = {
    background: chatBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderBottom: '0.5px solid rgba(255,255,255,0.22)',
  }
  const glassFooter: React.CSSProperties = {
    background: chatBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderTop: '0.5px solid rgba(255,255,255,0.22)',
  }

  const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥']

  return (
    <div className="absolute inset-0 z-20 animate-page-push">

      {/* ── Layer 0: True background ── */}
      <div className="absolute inset-0"
        style={{ backgroundColor: chatBg ? 'transparent' : '#FDF0EC', backgroundImage: chatBg ? `url(${chatBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />

      {/* ── Layer 1: Decorative elements for default bg ── */}
      {!chatBg && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[110px]"
            style={{ background: 'linear-gradient(180deg,rgba(201,134,126,0.28) 0%,transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-[90px]"
            style={{ background: 'linear-gradient(0deg,rgba(201,134,126,0.28) 0%,transparent 100%)' }} />
          {['⭐', '🌙', '☁️', '🌸', '⭐', '☁️'].map((s, i) => (
            <span key={i} className="absolute text-[26px] opacity-30"
              style={{ top: [78, 155, 295, 440, 510, 215][i], left: [18, 308, 38, 318, 62, 152][i], transform: `rotate(${[-15, 10, 0, -8, 20, 15][i]}deg)` }}>{s}</span>
          ))}
        </div>
      )}

      {/* ── Layer 2: Scrollable messages (padded for header/footer) ── */}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto scrollbar-none px-[10px]"
        style={{ paddingTop: 89, paddingBottom: 76 }}>
        {messages.length === 0 && char && (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
            <Avatar src={char.avatar} size={50} />
            <p className="text-[12px] font-bold text-[#888]">Say hi to {char.name}!</p>
          </div>
        )}
        <div className="flex flex-col gap-[2px] py-[8px]">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const nextMsg = messages[i + 1]
            const nextSame = nextMsg?.role === msg.role && (!isGroup || nextMsg?.charId === msg.charId)
            const hasReactions = (msg.reactions?.length ?? 0) > 0
            const msgChar = isGroup && msg.charId ? convChars.find((c) => c.id === msg.charId) : char
            const showSenderInfo = isGroup && !isUser && (!messages[i - 1] || messages[i - 1].charId !== msg.charId || messages[i - 1].role === 'user')

            if (msg.unsent) {
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-[8px]`}>
                  <div className="flex items-center gap-2 opacity-60">
                    <span className="text-[12px] text-[#888] italic">
                      {isUser ? '你撤回了一条消息' : `${msgChar?.name ?? 'TA'} 撤回了一条消息`}
                    </span>
                    {!isUser && (
                      <button onClick={() => setPeeking(peeking === msg.id ? null : msg.id)}
                        className="text-[11px] text-ios-blue font-bold active:opacity-60">偷看</button>
                    )}
                  </div>
                  {peeking === msg.id && msg.unsentText && (
                    <div className="mt-1 max-w-[78%] px-[10px] py-[5px] bg-white/40 rounded-[12px] border border-dashed border-[#ccc]">
                      <p className="text-[12px] text-[#888] italic">{msg.unsentText}</p>
                    </div>
                  )}
                </div>
              )
            }

            // Shared inline-quote block renderer
            const QuoteBlock = ({ qText, qName, isUserBubble }: { qText: string; qName: string; isUserBubble: boolean }) => (
              <div className={`flex items-start gap-[6px] mb-[5px] rounded-[8px] px-[8px] py-[5px] ${isUserBubble ? 'bg-black/[0.08]' : 'bg-black/[0.05]'}`}>
                <div className={`w-[2px] self-stretch rounded-full shrink-0 ${isUserBubble ? 'bg-[#25a558]' : 'bg-[#25D366]'}`} />
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold mb-[1px] ${isUserBubble ? 'text-[#1a7a40]' : 'text-[#25D366]'}`}>{qName}</p>
                  <p className="text-[11px] text-[#555] leading-tight line-clamp-2 break-words">{qText}</p>
                </div>
              </div>
            )

            // Group: assistant messages show avatar+name on the left
            if (isGroup && !isUser) {
              const stickerEmoji = isStickerText(msg.text)
              const isEmojiSticker = !!stickerEmoji
              const isImgSticker = msg.type === 'sticker' && !!msg.stickerUrl
              const isTransfer = msg.type === 'transfer'
              const noBubble = isEmojiSticker || isImgSticker || isTransfer
              return (
                <div key={msg.id} className={`flex items-end gap-[6px] ${nextSame ? 'mb-[1px]' : 'mb-[8px]'}`}>
                  <div className="shrink-0 w-[30px]">
                    {!nextSame && msgChar && <Avatar src={msgChar.avatar} size={28} />}
                  </div>
                  <div className="flex flex-col items-start max-w-[72%]">
                    {showSenderInfo && msgChar && (
                      <span className="text-[10px] font-bold text-[#888] mb-[3px] ml-[2px]">{msgChar.name}</span>
                    )}
                    {/* Bubble wrapper — relative so reactions are below bubble, not below timestamp */}
                    <div style={{ position: 'relative' }}>
                      <div
                        className={`select-none ${!noBubble ? 'px-[10px] py-[5px] bg-white rounded-[14px] rounded-bl-[4px]' : ''}`}
                        style={!noBubble ? { boxShadow: '0 0.5px 1.5px rgba(0,0,0,0.07)' } : {}}
                        onTouchStart={() => startLongPress(msg)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onContextMenu={(e) => { e.preventDefault(); setCtxMsg(msg) }}>
                        {msg.quotedText && !noBubble && (
                          <QuoteBlock qText={msg.quotedText} qName={msg.quotedSenderName ?? '对方'} isUserBubble={false} />
                        )}
                        {isTransfer ? (
                          <TransferCard msg={msg} isUser={false} onAccept={() => updateMessage(conv.id, msg.id, { transferAccepted: true })} />
                        ) : isImgSticker ? (
                          <img src={msg.stickerUrl} alt="sticker" className="w-[100px] h-[100px] object-contain rounded-[8px]" />
                        ) : isEmojiSticker ? (
                          <span className="text-[58px] leading-none select-none">{stickerEmoji}</span>
                        ) : (
                          <p className="text-[13px] font-semibold text-[#1a1a1a] leading-[1.42] break-words">{msg.text}</p>
                        )}
                      </div>
                      {hasReactions && (
                        <div className="absolute bottom-[-10px] left-[4px] flex gap-[2px] bg-white/95 rounded-full px-[6px] py-[3px] shadow-sm" style={{ backdropFilter: 'blur(8px)' }}>
                          {msg.reactions!.map((r) => (
                            <button key={r} onClick={() => updateMessage(conv.id, msg.id, { reactions: msg.reactions!.filter((e) => e !== r) })}
                              className="text-[13px] leading-none active:scale-110 transition-transform">{r}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {hasReactions && <div className="h-[16px]" />}
                    {!nextSame && (
                      <div className="flex items-center gap-2 mt-[3px] ml-[2px]">
                        <span className="text-[9px] text-[#aaa] leading-none">{msg.time}</span>
                        {!noBubble && msg.text && cloneVoiceSettings.enabled && msgChar?.cloneVoiceId && (
                          <button onClick={() => playCloneVoice(msg)} disabled={!!playingVoiceMsgId}
                            className="flex items-center gap-1 text-[10px] font-medium text-[#25D366] active:opacity-60 disabled:opacity-50">
                            {playingVoiceMsgId === msg.id ? <span className="inline-block w-3 h-3 rounded-full bg-[#25D366] animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" strokeWidth={2} />}
                            播放
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            // Single chat or user messages
            const msgStickerEmoji = !isUser ? isStickerText(msg.text) : null
            const msgIsEmojiSticker = !!msgStickerEmoji
            const msgIsImgSticker = msg.type === 'sticker' && !!msg.stickerUrl
            const msgIsTransfer = msg.type === 'transfer'
            const msgNoBubble = msgIsEmojiSticker || msgIsImgSticker || msgIsTransfer
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${nextSame ? 'mb-[1px]' : 'mb-[8px]'}`}>
                {/* max-width via inline style avoids the CSS circular dependency with flex-start alignment */}
                <div style={{ maxWidth: '78%', position: 'relative' }}>
                  <div
                    className={`select-none ${msgNoBubble ? '' : isUser ? 'px-[10px] py-[5px] bg-[#DCF8C6] rounded-[14px] rounded-br-[4px]' : 'px-[10px] py-[5px] bg-white rounded-[14px] rounded-bl-[4px]'}`}
                    style={msgNoBubble ? {} : { boxShadow: '0 0.5px 1.5px rgba(0,0,0,0.07)' }}
                    onTouchStart={() => startLongPress(msg)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMsg(msg) }}>
                    {msg.quotedText && !msgNoBubble && (
                      <QuoteBlock qText={msg.quotedText} qName={msg.quotedSenderName ?? (isUser ? '你' : (char?.name ?? 'Ta'))} isUserBubble={isUser} />
                    )}
                    {msgIsTransfer ? (
                      <TransferCard msg={msg} isUser={isUser} />
                    ) : msgIsImgSticker ? (
                      <img src={msg.stickerUrl} alt="sticker" className="w-[100px] h-[100px] object-contain rounded-[8px]" />
                    ) : msgIsEmojiSticker ? (
                      <span className="text-[58px] leading-none select-none">{msgStickerEmoji}</span>
                    ) : (
                      <p className="text-[13px] font-semibold text-[#1a1a1a] leading-[1.42] break-words">{msg.text}</p>
                    )}
                  </div>
                  {hasReactions && (
                    <div className={`absolute bottom-[-10px] ${isUser ? 'right-[4px]' : 'left-[4px]'} flex gap-[2px] bg-white/95 rounded-full px-[6px] py-[3px] shadow-sm`} style={{ backdropFilter: 'blur(8px)' }}>
                      {msg.reactions!.map((r) => (
                        <button key={r} onClick={() => updateMessage(conv.id, msg.id, { reactions: msg.reactions!.filter((e) => e !== r) })}
                          className="text-[13px] leading-none active:scale-110 transition-transform">{r}</button>
                      ))}
                    </div>
                  )}
                </div>
                {hasReactions && <div className="h-[16px]" />}
                {!nextSame && (
                  <div className="flex items-center gap-2 mt-[3px] px-[2px]">
                    <span className="text-[9px] text-[#aaa] leading-none">{msg.time}</span>
                    {!isUser && !msgNoBubble && msg.text && cloneVoiceSettings.enabled && char?.cloneVoiceId && (
                      <button onClick={() => playCloneVoice(msg)} disabled={!!playingVoiceMsgId}
                        className="flex items-center gap-1 text-[10px] font-medium text-[#25D366] active:opacity-60 disabled:opacity-50">
                        {playingVoiceMsgId === msg.id ? (
                          <span className="inline-block w-3 h-3 rounded-full bg-[#25D366] animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" strokeWidth={2} />
                        )}
                        播放
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {loading && (
            <div className="flex items-end gap-[6px] mb-[6px]">
              {isGroup && groupLoadingCharId ? (
                <>
                  <div className="shrink-0 w-[30px]">
                    {(() => { const lc = convChars.find((c) => c.id === groupLoadingCharId); return lc ? <Avatar src={lc.avatar} size={28} /> : null })()}
                  </div>
                  <div className="flex flex-col items-start">
                    {(() => { const lc = convChars.find((c) => c.id === groupLoadingCharId); return lc ? <span className="text-[10px] font-bold text-[#888] mb-[3px] ml-[2px]">{lc.name}</span> : null })()}
                    <div className="bg-white rounded-[14px] rounded-bl-[4px] px-[12px] py-[9px]" style={{ boxShadow: '0 0.5px 1.5px rgba(0,0,0,0.07)' }}>
                      <div className="flex gap-[4px] items-center">
                        {[0, 1, 2].map((idx) => <div key={idx} className="w-[6px] h-[6px] rounded-full bg-[#ccc]" style={{ animation: `bar-bounce 1s ease-in-out ${idx * 0.2}s infinite` }} />)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="ml-[36px] bg-white rounded-[14px] rounded-bl-[4px] px-[12px] py-[9px]" style={{ boxShadow: '0 0.5px 1.5px rgba(0,0,0,0.07)' }}>
                  <div className="flex gap-[4px] items-center">
                    {[0, 1, 2].map((idx) => <div key={idx} className="w-[6px] h-[6px] rounded-full bg-[#ccc]" style={{ animation: `bar-bounce 1s ease-in-out ${idx * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Layer 3: Frosted glass header (absolute top) ── */}
      <div className="absolute top-0 left-0 right-0 z-[5] flex items-center gap-[8px] px-3 pt-[48px] pb-[7px]"
        style={glassHeader}>
        <button onClick={onBack} className="text-[#25D366] active:opacity-60 shrink-0"><ChevronLeft className="w-[26px] h-[26px]" /></button>
        {isGroup
          ? <GroupAvatar avatars={convChars.map((c) => c.avatar)} size={36} />
          : char && <Avatar src={char.avatar} size={34} online />
        }
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#1a1a1a] truncate leading-tight">{groupName}</p>
          {isGroup
            ? <p className="text-[10px] text-[#888] leading-tight">{convChars.length} 位成员</p>
            : <p className="text-[10px] font-bold text-[#25D366] leading-tight">online</p>
          }
        </div>
        <button onClick={() => setShowSettings(true)} className="p-1 active:opacity-60"><MoreVertical className="w-[19px] h-[19px] text-[#555]" /></button>
      </div>

      {/* ── Emoji picker (floating above footer, outside glass) ── */}
      {showEmoji && (
        <div className="absolute bottom-0 left-0 right-0 z-[6] px-[10px]" style={{ bottom: '90px' }}>
          <EmojiPicker
            onSelect={(e) => setInput((v) => v + e)}
            onSendSticker={sendSticker}
            visible={showEmoji}
          />
        </div>
      )}

      {/* ── Layer 3: Frosted glass footer (absolute bottom) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[5] px-[10px] pb-[20px]"
        style={glassFooter}>
        {/* Quote bar */}
        {quotedMsg && (
          <div className="flex items-center gap-[8px] bg-white/20 rounded-[10px] px-3 py-[7px] mb-[6px]" style={{ border: '0.5px solid rgba(255,255,255,0.3)' }}>
            <div className="w-[2px] h-[28px] bg-[#25D366] rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white mb-[1px]">{quotedMsg.role === 'user' ? '你' : (convChars.find(c => c.id === quotedMsg.charId)?.name ?? char?.name ?? 'Ta')}</p>
              <p className="text-[11px] text-white/80 truncate">{quotedMsg.text.slice(0, 50)}{quotedMsg.text.length > 50 ? '…' : ''}</p>
            </div>
            <button onClick={() => setQuotedMsg(null)} className="shrink-0 active:opacity-60 p-1">
              <X className="w-[14px] h-[14px] text-white/70" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-[8px] pt-[10px] pb-[8px]">
          {/* + more options button */}
          <button onClick={() => { setShowEmoji(false); setShowExtra(true) }}
            className="shrink-0 w-[34px] h-[34px] rounded-full bg-white/80 flex items-center justify-center active:scale-90 transition-transform"
            style={{ boxShadow: '0 0.5px 2px rgba(0,0,0,0.1)' }}>
            <Plus className="w-[18px] h-[18px] text-[#555]" strokeWidth={2} />
          </button>

          {/* Input box or voice mode */}
          {voiceMode ? (
            <div className="flex-1 flex flex-col items-stretch gap-1">
              {voiceError && (
                <p className="text-[11px] text-amber-600 px-2 text-center">{voiceError}</p>
              )}
              <button
                onPointerDown={(e) => { e.preventDefault(); startVoiceInput() }}
                onPointerUp={(e) => { e.preventDefault(); stopVoiceInput(); setVoiceMode(false) }}
                onPointerLeave={() => { if (isRecordingVoice) { stopVoiceInput(); setVoiceMode(false) } }}
                onTouchStart={(e) => e.preventDefault()}
                onTouchEnd={(e) => { e.preventDefault(); stopVoiceInput(); setVoiceMode(false) }}
                className="bg-white rounded-full flex items-center justify-center h-[34px] gap-2 active:bg-gray-50 touch-none"
                style={{ boxShadow: '0 0.5px 2px rgba(0,0,0,0.07)' }}
              >
                <Mic className={`w-[15px] h-[15px] ${isRecordingVoice ? 'text-red-500' : 'text-[#25D366]'}`} strokeWidth={2} />
                <span className="text-[13px] font-medium text-[#888]">
                  {isRecordingVoice ? '正在听…' : '按住说话'}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-full flex items-center px-[12px] h-[34px] gap-[6px]"
              style={{ boxShadow: '0 0.5px 2px rgba(0,0,0,0.07)' }}>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                onFocus={() => setShowEmoji(false)}
                placeholder="发消息…"
                className="flex-1 text-[13px] font-medium text-[#1a1a1a] outline-none bg-transparent placeholder:text-[#ccc] leading-none" />
              <button onClick={() => setShowEmoji((v) => !v)}
                className={`shrink-0 flex items-center active:opacity-60 transition-opacity ${showEmoji ? 'text-[#25D366]' : 'text-[#bbb]'}`}>
                <Smile className="w-[17px] h-[17px]" strokeWidth={1.6} />
              </button>
              <button onClick={() => { setShowEmoji(false); setVoiceMode(true) }}
                className="shrink-0 flex items-center text-[#bbb] active:opacity-60">
                <Mic className="w-[16px] h-[16px]" strokeWidth={1.8} />
              </button>
            </div>
          )}

          {/* Send arrow button */}
          <button onClick={sendMessage} disabled={loading}
            className={`shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center active:opacity-80 disabled:opacity-50 transition-colors ${input.trim() ? 'bg-[#25D366]' : 'bg-white/80'}`}
            style={{ boxShadow: '0 0.5px 2px rgba(0,0,0,0.1)' }}>
            <ArrowUp className={`w-[16px] h-[16px] ${input.trim() ? 'text-white' : 'text-[#aaa]'}`} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Layer 10: context menu ── */}
      {ctxMsg && (
        <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setCtxMsg(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[260px]">
            {/* Emoji reaction strip */}
            <div className="flex items-center justify-center gap-[8px] bg-white/95 rounded-[18px] px-[12px] py-[9px] mb-[8px] shadow-xl"
              style={{ backdropFilter: 'blur(20px)' }}>
              {REACTIONS.map((r) => (
                <button key={r} onClick={() => reactToMsg(r)}
                  className={`text-[22px] leading-none active:scale-125 transition-transform ${ctxMsg.reactions?.includes(r) ? 'scale-110' : 'opacity-70'}`}>
                  {r}
                </button>
              ))}
            </div>
            {/* Actions */}
            <div className="bg-white/97 rounded-[16px] overflow-hidden shadow-xl" style={{ backdropFilter: 'blur(20px)' }}>
              {([
                { label: '复制', Icon: Copy, action: () => { navigator.clipboard.writeText(ctxMsg.text); setCtxMsg(null) } },
                { label: '引用', Icon: Quote, action: () => { setQuotedMsg(ctxMsg); setCtxMsg(null) } },
                { label: '转发', Icon: Share2, action: () => { setForwardingMsg(ctxMsg); setCtxMsg(null) } },
                ctxMsg.role === 'assistant'
                  ? { label: '重新回复', Icon: RotateCcw, action: () => resendMsg(ctxMsg) }
                  : { label: '撤回', Icon: Undo2, action: () => unsendMsg(ctxMsg), red: true },
                { label: '删除', Icon: Trash2, action: () => { removeMessage(conv.id, ctxMsg.id); setCtxMsg(null) }, red: true },
              ] as { label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; action: () => void; red?: boolean }[]).map((item, idx, arr) => (
                <button key={item.label} onClick={item.action}
                  className={`w-full flex items-center justify-between px-[16px] py-[13px] active:bg-gray-50 ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className={`text-[14px] font-medium ${item.red ? 'text-red-500' : 'text-[#1a1a1a]'}`}>{item.label}</span>
                  <item.Icon className={`w-[16px] h-[16px] ${item.red ? 'text-red-400' : 'text-[#888]'}`} strokeWidth={1.8} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Forward modal ── */}
      {forwardingMsg && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setForwardingMsg(null)}>
          <div className="bg-card rounded-[20px] w-full max-w-[310px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center px-4 py-[13px] border-b border-ios-bg">
              <p className="text-[15px] font-bold text-ios-text flex-1">转发到</p>
              <button onClick={() => setForwardingMsg(null)}><X className="w-5 h-5 text-ios-text-secondary" /></button>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-none">
              {conversations.filter((c) => c.id !== convId).map((c) => {
                const cc = c.charIds.map((id) => chars.find((ch) => ch.id === id)).filter(Boolean) as AIChar[]
                const cname = c.nickname || (c.isGroup ? cc.map((ch) => ch.name).join('、') : cc[0]?.name ?? '未知')
                return (
                  <button key={c.id} onClick={() => {
                    addMessage(c.id, { text: `[转发] ${forwardingMsg.text}`, role: 'user', time: nowTime() })
                    setForwardingMsg(null)
                  }} className="w-full flex items-center gap-3 px-4 py-[11px] active:bg-ios-bg border-b border-ios-bg last:border-b-0">
                    {c.isGroup ? <GroupAvatar avatars={cc.map((ch) => ch.avatar)} size={36} /> : <Avatar src={cc[0]?.avatar ?? ''} size={36} />}
                    <p className="text-[14px] font-medium text-ios-text truncate">{cname}</p>
                  </button>
                )
              })}
              {conversations.filter((c) => c.id !== convId).length === 0 && (
                <p className="text-[13px] text-ios-text-secondary text-center py-6">暂无其他对话</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showExtra && (
        <ExtraOptionsSheet
          visible={showExtra}
          onClose={() => setShowExtra(false)}
          onTransfer={() => { setShowExtra(false); setShowTransfer(true) }}
        />
      )}
      {showTransfer && (
        <TransferModal
          charName={isGroup ? groupName : (char?.name ?? '对方')}
          onSend={sendTransfer}
          onClose={() => setShowTransfer(false)}
        />
      )}
      {showSettings && <ConvSettings conv={conv} onBack={() => setShowSettings(false)} />}
    </div>
  )
}

/* ─── Filter Bar ─── */
const FILTERS: { id: Filter; label: string; badge?: number }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'single', label: 'Private' },
  { id: 'groups', label: 'Groups' },
]

function FilterBar({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="flex items-center gap-[8px] px-4 py-[8px] overflow-x-auto scrollbar-none shrink-0">
      {FILTERS.map((f) => (
        <button key={f.id} onClick={() => onChange(f.id)}
          className={`px-[14px] py-[5px] rounded-full text-[12px] font-bold shrink-0 transition-colors ${active === f.id ? 'bg-[#25D366] text-white' : 'bg-ios-bg text-ios-text-secondary'}`}>
          {f.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Chats Tab ─── */
function ChatsTab({ filter, onOpen, editMode }: { filter: Filter; onOpen: (id: string) => void; editMode: boolean }) {
  const { conversations, chars, removeConversation, togglePinConversation, toggleHideConversation } = usePhoneStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const allConversations = conversations
    .filter((c) => !c.hidden || filter === 'all') // show hidden only in non-filtered mode
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) // pinned first
  const filtered = allConversations.filter((c) => {
    if (filter === 'unread') return c.unread > 0
    if (filter === 'groups') return c.isGroup
    if (filter === 'single') return !c.isGroup
    return !c.hidden
  })
  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-ios-text-secondary">
        <MessageCircle className="w-12 h-12 opacity-20 mb-2" />
        <p className="text-[13px] font-bold">No chats yet</p>
        <p className="text-[12px] mt-1">Tap + to start a conversation</p>
      </div>
    )
  }
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none">
      {filtered.map((conv) => {
        const convChars = conv.charIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean) as import('../store/phoneStore').AIChar[]
        const firstChar = convChars[0]
        const lastMsg = conv.messages[conv.messages.length - 1]
        const autoName = conv.isGroup ? convChars.map((c) => c.name).join('、') : firstChar?.name ?? 'Unknown'
        const displayName = conv.nickname || autoName
        let lastMsgText = lastMsg
          ? lastMsg.type === 'transfer' ? `[转账] ¥${lastMsg.transferAmount?.toFixed(2)}`
          : lastMsg.type === 'sticker' ? '[表情]'
          : lastMsg.text
          : '暂无消息'
        if (conv.isGroup && lastMsg && lastMsg.role === 'assistant' && lastMsg.charId && lastMsg.type !== 'transfer' && lastMsg.type !== 'sticker') {
          const sender = chars.find((c) => c.id === lastMsg.charId)
          if (sender) lastMsgText = `${sender.name}: ${lastMsg.text}`
        }
        const isEditing = editMode && editingId === conv.id
        return (
          <div key={conv.id}>
            <div className={`flex items-center ${conv.pinned ? 'bg-[#f9f9f9]' : ''}`}>
              {editMode && (
                <button onClick={() => setEditingId(isEditing ? null : conv.id)}
                  className="shrink-0 w-[22px] h-[22px] rounded-full bg-red-500 flex items-center justify-center ml-3 active:scale-90 transition-transform">
                  <X className="w-[12px] h-[12px] text-white" strokeWidth={2.5} />
                </button>
              )}
              <button onClick={() => editMode ? setEditingId(isEditing ? null : conv.id) : onOpen(conv.id)}
                className="flex-1 flex items-center gap-[12px] px-4 py-[10px] active:bg-ios-bg/50 transition-colors text-left min-w-0">
                <div className="relative shrink-0">
                  {conv.isGroup ? (
                    <GroupAvatar avatars={convChars.map((c) => c.avatar)} size={50} />
                  ) : (
                    <Avatar src={firstChar?.avatar ?? '❓'} size={50} online />
                  )}
                  {conv.pinned && (
                    <div className="absolute bottom-[-2px] right-[-2px] w-[14px] h-[14px] rounded-full bg-[#25D366] flex items-center justify-center">
                      <PinIcon className="w-[8px] h-[8px] text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14.5px] font-bold text-ios-text truncate">{displayName}</span>
                    <span className={`text-[11px] shrink-0 ml-2 font-medium ${conv.unread > 0 ? 'text-[#25D366] font-bold' : 'text-ios-text-secondary'}`}>
                      {lastMsg?.time ?? ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-[2px]">
                    <span className="text-[12.5px] font-medium text-ios-text-secondary truncate pr-3">{lastMsgText}</span>
                    {conv.unread > 0 && (
                      <span className="shrink-0 min-w-[20px] h-[20px] rounded-full bg-[#25D366] text-white text-[10.5px] font-bold flex items-center justify-center px-[5px]">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
            {/* Edit actions for this conversation */}
            {isEditing && (
              <div className="flex items-center justify-around bg-[#f5f5f5] px-4 py-[10px] border-t border-ios-bg">
                <button onClick={() => { togglePinConversation(conv.id); setEditingId(null) }}
                  className="flex flex-col items-center gap-1 active:opacity-60">
                  <PinIcon className={`w-5 h-5 ${conv.pinned ? 'text-[#25D366]' : 'text-ios-text-secondary'}`} />
                  <span className="text-[11px] font-bold text-ios-text-secondary">{conv.pinned ? '取消置顶' : '置顶'}</span>
                </button>
                <button onClick={() => { toggleHideConversation(conv.id); setEditingId(null) }}
                  className="flex flex-col items-center gap-1 active:opacity-60">
                  {conv.hidden ? <Eye className="w-5 h-5 text-ios-text-secondary" /> : <EyeOff className="w-5 h-5 text-ios-text-secondary" />}
                  <span className="text-[11px] font-bold text-ios-text-secondary">{conv.hidden ? '取消隐藏' : '隐藏'}</span>
                </button>
                <button onClick={() => { if (window.confirm('删除这个对话？')) { removeConversation(conv.id); setEditingId(null) } }}
                  className="flex flex-col items-center gap-1 active:opacity-60">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span className="text-[11px] font-bold text-red-500">删除</span>
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Char Form ─── */
function CharForm({ char, onBack, initialShowPreview }: { char?: AIChar; onBack: () => void; initialShowPreview?: boolean }) {
  const { addChar, updateChar, apiSettings } = usePhoneStore()
  const [name, setName] = useState(char?.name ?? '')
  const [avatar, setAvatar] = useState(char?.avatar ?? '')
  const [rawPersona, setRawPersona] = useState(char?.rawPersona ?? '')
  const [cloneVoiceId, setCloneVoiceId] = useState(char?.cloneVoiceId ?? '')
  const [processing, setProcessing] = useState(false)
  const [aiOrganize, setAiOrganize] = useState(true)
  const [organizeError, setOrganizeError] = useState('')
  // Preview state — set after AI processes, shown before final save
  const [preview, setPreview] = useState<{
    corePrompt: string
    dialogExamples: DialogExample[]
    memoryChunks: MemoryChunk[]
    expandExamples: boolean
    expandMemory: boolean
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setAvatar(r.result as string); r.readAsDataURL(file); e.target.value = ''
  }

  async function handleSave() {
    if (!name.trim()) return
    const base = { name: name.trim(), avatar, rawPersona, cloneVoiceId: cloneVoiceId.trim() || undefined }

    if (!aiOrganize || !apiSettings.baseUrl || !apiSettings.apiKey || !rawPersona.trim()) {
      // If persona text changed, clear stale AI-processed data so new rawPersona is used directly
      const personaChanged = rawPersona !== (char?.rawPersona ?? '')
      const clearStale = personaChanged ? { corePrompt: undefined as string | undefined, dialogExamples: undefined as import('../store/phoneStore').DialogExample[] | undefined, memoryChunks: undefined as import('../store/phoneStore').MemoryChunk[] | undefined } : {}
      if (char) updateChar(char.id, { ...base, ...clearStale }); else addChar(base)
      onBack(); return
    }

    setProcessing(true)
    setOrganizeError('')
    try {
      const prompt = `分析以下角色人设，输出JSON（仅JSON，不含其他文字，不要用XML标签包裹）。
角色名：${name.trim()}
人设：${rawPersona}

输出格式：
{"corePrompt":"80字内，第三人称描述性格核心和说话节奏，不堆砌","dialogExamples":[{"user":"对方说的话","reply":"角色回复"}],"memoryChunks":[{"tags":["触发词"],"content":"记忆内容"}]}

【dialogExamples 要求——这是最重要的部分】
生成6条，必须像真人微信聊天截图，严格遵守：

1. 每条气泡只放一个短句（3-15字），用|||分隔多条气泡。禁止一个气泡里塞长段话。
2. 口语化：省略主语、语序颠倒、句子不完整很正常。"走了啊""那个 你说的""行吧 懒得管你"
3. 标点是性格：句号少用，逗号可省。"……"犹豫，"？"疑惑，"。"冷淡。语气词看性格用。
4. 回复长度随机：有的只有1条气泡（"哦""嗯""？"），有的2-3条，极少4条。
5. 绝大多数回复不带emoji，6条里最多1条可以有emoji，直接打emoji字符即可。
6. 情绪克制，不戏剧化。真人聊天大多数时候很平淡。
7. 不同性格味道不同：冷的人不加语气词，热情的人"哈哈""啦""呀"，毒舌用反问。

范例（理解风格，不要照抄）：
"在干嘛" → 没干嘛|||你呢
"出来玩吗" → 不想动……|||你来找我吧
"生日快乐！" → 谢啦|||蛋糕呢
"你怎么又迟到" → ？|||我没迟到啊|||你看错时间了吧
"晚安" → 嗯 早点睡

memoryChunks 3-5条，具体经历/爱好碎片化记忆。`

      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 30000)
      const useSummary = !!(apiSettings.advancedApiEnabled && apiSettings.summaryModel)
      const organizeModel = useSummary ? apiSettings.summaryModel : (apiSettings.model || 'gemini-2.0-flash')
      const organizeTemp = useSummary ? (apiSettings.summaryTemperature ?? 0.7) : 0.85
      const res = await fetch(`${apiSettings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiSettings.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: organizeModel,
          temperature: organizeTemp,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      clearTimeout(t)

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        throw new Error(`API ${res.status}：${errText.slice(0, 80)}`)
      }

      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content ?? ''
      if (!raw.trim()) throw new Error('API 返回空内容')

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 未返回有效 JSON 格式')

      const parsed = JSON.parse(jsonMatch[0])
      const rawChunks = Array.isArray(parsed.memoryChunks) ? parsed.memoryChunks.filter((m: MemoryChunk) => m.content) : []
      setPreview({
        corePrompt: parsed.corePrompt ?? '',
        dialogExamples: Array.isArray(parsed.dialogExamples) ? parsed.dialogExamples.filter((e: DialogExample) => e.user && e.reply) : [],
        memoryChunks: rawChunks.map((m: MemoryChunk) => ({ ...m, tags: Array.isArray(m.tags) ? m.tags : [] })),
        expandExamples: false,
        expandMemory: false,
      })
      setProcessing(false); return
    } catch (e) {
      const msg = (e as Error).message || '未知错误'
      setOrganizeError(msg.includes('abort') ? '请求超时，请重试' : msg)
      setProcessing(false)
    }
  }

  function confirmPreview() {
    if (!preview) return
    const structured = { name: name.trim(), avatar, rawPersona, corePrompt: preview.corePrompt, dialogExamples: preview.dialogExamples, memoryChunks: preview.memoryChunks, cloneVoiceId: cloneVoiceId.trim() || undefined }
    if (char) updateChar(char.id, structured); else addChar(structured)
    onBack()
  }

  function openExistingPreview() {
    if (!char?.corePrompt) return
    setPreview({
      corePrompt: char.corePrompt ?? '',
      dialogExamples: char.dialogExamples ?? [],
      memoryChunks: char.memoryChunks ?? [],
      expandExamples: true,
      expandMemory: false,
    })
  }

  // Auto-open preview when opened from ConvSettings memory row
  useEffect(() => {
    if (initialShowPreview && char?.corePrompt) openExistingPreview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasProcessed = !!(char?.corePrompt)

  // ── Preview screen ──
  if (preview) {
    return (
      <div className="absolute inset-0 z-30 bg-ios-bg flex flex-col animate-page-push">
        <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
          <button onClick={() => setPreview(null)} className="text-[#25D366] text-[13px] font-bold active:opacity-60">← 返回修改</button>
          <h1 className="text-[15px] font-bold text-ios-text flex-1 text-center">整理预览</h1>
          <button onClick={confirmPreview} className="text-[#25D366] text-[13px] font-bold active:opacity-60">确认保存</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">
          {/* Core prompt */}
          <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">性格核心</p>
          <div className="bg-card rounded-[14px] px-4 py-[11px] mb-5">
            <textarea
              value={preview.corePrompt}
              onChange={(e) => setPreview({ ...preview, corePrompt: e.target.value })}
              rows={4}
              className="w-full bg-transparent text-[13px] text-ios-text outline-none leading-relaxed resize-none"
            />
          </div>

          {/* Dialog examples */}
          <button onClick={() => setPreview({ ...preview, expandExamples: !preview.expandExamples })}
            className="flex items-center justify-between w-full px-1 mb-[6px]">
            <p className="text-[11px] font-bold text-ios-text-secondary uppercase">对话示例 · {preview.dialogExamples.length} 条</p>
            <ChevronRight className={`w-[14px] h-[14px] text-ios-text-secondary/50 transition-transform ${preview.expandExamples ? 'rotate-90' : ''}`} />
          </button>
          {preview.expandExamples && (
            <div className="bg-card rounded-[14px] overflow-hidden mb-5">
              {preview.dialogExamples.map((ex, i) => (
                <div key={i} className={`px-4 py-[10px] ${i < preview.dialogExamples.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                  <p className="text-[10px] font-bold text-ios-text-secondary/50 mb-[3px]">对方</p>
                  <input value={ex.user} onChange={(e) => { const n = [...preview.dialogExamples]; n[i] = { ...n[i], user: e.target.value }; setPreview({ ...preview, dialogExamples: n }) }}
                    className="w-full bg-transparent text-[12px] text-ios-text outline-none mb-[5px]" />
                  <p className="text-[10px] font-bold text-[#25D366] mb-[3px]">Ta 的回复</p>
                  <textarea value={ex.reply} onChange={(e) => { const n = [...preview.dialogExamples]; n[i] = { ...n[i], reply: e.target.value }; setPreview({ ...preview, dialogExamples: n }) }}
                    rows={2} className="w-full bg-transparent text-[12px] text-ios-text outline-none resize-none leading-relaxed" />
                </div>
              ))}
            </div>
          )}
          {!preview.expandExamples && <div className="mb-5" />}

          {/* Memory chunks */}
          <button onClick={() => setPreview({ ...preview, expandMemory: !preview.expandMemory })}
            className="flex items-center justify-between w-full px-1 mb-[6px]">
            <p className="text-[11px] font-bold text-ios-text-secondary uppercase">记忆库 · {preview.memoryChunks.length} 条</p>
            <ChevronRight className={`w-[14px] h-[14px] text-ios-text-secondary/50 transition-transform ${preview.expandMemory ? 'rotate-90' : ''}`} />
          </button>
          {preview.expandMemory && (
            <div className="flex flex-col gap-2 mb-5">
              {preview.memoryChunks.map((chunk, i) => (
                <div key={i} className="bg-card rounded-[14px] overflow-hidden">
                  <div className="px-4 py-[8px] border-b border-ios-bg">
                    <span className="text-[10px] font-bold text-ios-text-secondary/50 mr-2">触发词</span>
                    <span className="text-[11px] text-[#25D366]">{(Array.isArray(chunk.tags) ? chunk.tags : []).join('、')}</span>
                  </div>
                  <div className="px-4 py-[8px]">
                    <textarea value={chunk.content} onChange={(e) => { const n = [...preview.memoryChunks]; n[i] = { ...n[i], content: e.target.value }; setPreview({ ...preview, memoryChunks: n }) }}
                      rows={2} className="w-full bg-transparent text-[12px] text-ios-text outline-none resize-none leading-relaxed" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-ios-text-secondary/40 px-1">可直接修改后确认保存，也可返回重新编辑原始人设。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-30 bg-ios-bg flex flex-col animate-page-push">
      {/* Header */}
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={onBack} disabled={processing} className="text-[#25D366] text-[13px] font-bold active:opacity-60 disabled:opacity-30">取消</button>
        <h1 className="text-[15px] font-bold text-ios-text flex-1 text-center">{char ? '编辑角色' : '新建角色'}</h1>
        <button onClick={handleSave} disabled={!name.trim() || processing}
          className="text-[#25D366] text-[13px] font-bold active:opacity-60 disabled:opacity-30">
          {processing ? '整理中…' : '保存'}
        </button>
      </div>

      {/* Processing overlay */}
      {processing && (
        <div className="absolute inset-0 z-40 bg-ios-bg/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <div className="w-[44px] h-[44px] rounded-full border-[3px] border-[#25D366]/20 border-t-[#25D366] animate-spin" />
          <p className="text-[14px] font-semibold text-ios-text">AI 正在整理人设</p>
          <p className="text-[11px] text-ios-text-secondary">提取性格 · 生成示例 · 建立记忆库</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 scrollbar-none">
        {/* Avatar + Name */}
        <div className="bg-card rounded-[14px] overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-4 py-[13px]">
            <button onClick={() => fileRef.current?.click()} className="relative shrink-0 active:opacity-80">
              {avatar ? (
                <img src={avatar} alt="" className="w-[46px] h-[46px] rounded-full object-cover" />
              ) : (
                <div className="w-[46px] h-[46px] rounded-full bg-[#f0f0f0] flex items-center justify-center">
                  <Camera className="w-5 h-5 text-[#bbb]" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full bg-[#25D366] flex items-center justify-center">
                <Camera className="w-2.5 h-2.5 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="角色名称"
              className="flex-1 bg-transparent text-[15px] font-bold text-ios-text outline-none placeholder:text-ios-text-secondary/40" />
          </div>
        </div>

        {/* Persona textarea */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">人设描述</p>
        <div className="bg-card rounded-[14px] px-4 py-[13px] mb-2">
          <textarea
            value={rawPersona}
            onChange={(e) => setRawPersona(e.target.value)}
            rows={10}
            placeholder={`随意描述这个角色，长短不限。

可以写：
• 性格、说话方式、作息习惯
• 成长背景、经历、兴趣爱好
• 口头禅、语气词、常用标点……！！ 。。。 ？？ 哈哈 嗯嗯
• 聊天时会无意识冒出的想法、情绪反应
• 让你觉得"这个人真实存在"的任何细节

保存后 AI 会自动整理，不需要考虑格式。`}
            className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30 leading-relaxed resize-none"
          />
        </div>
        {hasProcessed && (
          <p className="text-[11px] text-[#25D366] px-1 mb-3">✓ 已完成 AI 整理，修改后保存将重新整理</p>
        )}

        {/* 克隆音色 ID（MiniMax T2A） */}
        <div className="bg-card rounded-[14px] overflow-hidden mb-4">
          <div className="px-4 py-[12px]">
            <label className="text-[12px] font-semibold text-ios-text-secondary mb-[6px] block">音色 ID（MiniMax 语音）</label>
            <input value={cloneVoiceId} onChange={(e) => setCloneVoiceId(e.target.value)}
              placeholder="留空则不使用语音克隆"
              className="w-full bg-ios-bg rounded-[10px] px-3 py-[9px] text-[14px] text-ios-text outline-none placeholder:text-ios-text-secondary/50" />
            <p className="text-[11px] text-ios-text-secondary/70 mt-[4px]">在设置中开启克隆音色并配置 MiniMax 后，AI 回复可点击播放为该角色音色</p>
          </div>
        </div>

        {/* AI Organize toggle */}
        <div className="bg-card rounded-[14px] overflow-hidden mb-2">
          <div className="flex items-center gap-3 px-4 py-[13px]">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-ios-text">AI 自动整理人设</p>
              <p className="text-[11px] text-ios-text-secondary mt-[2px]">保存后可预览并修改整理结果</p>
            </div>
            {hasProcessed && (
              <button onClick={openExistingPreview}
                className="text-[#25D366] text-[12px] font-medium shrink-0 active:opacity-60 px-[8px] py-[4px] bg-[#25D366]/10 rounded-[8px]">
                查看
              </button>
            )}
            <button
              onClick={() => setAiOrganize(!aiOrganize)}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${aiOrganize && apiSettings.baseUrl ? 'bg-[#25D366]' : 'bg-[#e5e5ea]'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform ${aiOrganize && apiSettings.baseUrl ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>
          {!apiSettings.baseUrl && (
            <div className="px-4 pb-[11px]">
              <p className="text-[11px] text-amber-500/80 mb-[4px]">⚠ 需要先在设置中配置 API 才能使用</p>
              <p className="text-[10px] text-ios-text-secondary/60 leading-relaxed">推荐使用 Gemini：API 地址填 <span className="font-mono text-ios-text/70">https://generativelanguage.googleapis.com/v1beta/openai</span>，模型填 <span className="font-mono text-ios-text/70">gemini-2.0-flash</span></p>
            </div>
          )}
          {organizeError && (
            <div className="px-4 pb-[11px]">
              <p className="text-[11px] text-red-500">❌ 整理失败：{organizeError}</p>
              <button onClick={() => { setOrganizeError(''); handleSave() }} className="text-[11px] text-[#25D366] font-bold mt-1 active:opacity-60">重试</button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-ios-text-secondary/40 px-1 mb-1">关闭时直接保存原始文本，聊天同样有效。</p>
      </div>
    </div>
  )
}

/* ─── Contacts Tab ─── */
function ContactsTab() {
  const { chars, removeChar } = usePhoneStore()
  const [editingChar, setEditingChar] = useState<AIChar | undefined>()
  const [creating, setCreating] = useState(false)

  if (editingChar !== undefined || creating) {
    return <CharForm char={editingChar} onBack={() => { setEditingChar(undefined); setCreating(false) }} />
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-3 pb-4">
      <button onClick={() => setCreating(true)}
        className="w-full flex items-center gap-3 bg-card rounded-[14px] px-4 py-[12px] mb-4 active:opacity-80 transition-opacity">
        <div className="w-[38px] h-[38px] rounded-full bg-[#25D366]/12 flex items-center justify-center shrink-0">
          <Plus className="w-[18px] h-[18px] text-[#25D366]" />
        </div>
        <p className="text-[14px] font-bold text-[#25D366]">New Character</p>
      </button>
      {chars.length === 0 ? (
        <p className="text-[13px] font-medium text-ios-text-secondary text-center py-8">No characters yet</p>
      ) : (
        <div className="bg-card rounded-[14px] overflow-hidden">
          {chars.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-[11px] ${i < chars.length - 1 ? 'border-b border-ios-bg' : ''}`}>
              <Avatar src={c.avatar} size={42} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-ios-text">{c.name}</p>
                {c.corePrompt && <p className="text-[11px] text-[#25D366]">✓ 已整理</p>}
              </div>
              <button onClick={() => setEditingChar(c)} className="p-1 text-[#25D366] active:opacity-60 mr-1"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => removeChar(c.id)} className="p-1 text-red-400 active:opacity-60"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Mask Form ─── */
function MaskForm({ mask, onBack }: { mask?: UserMask; onBack: () => void }) {
  const { addUserMask, updateUserMask } = usePhoneStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState(mask?.avatar ?? '')
  const [name, setName] = useState(mask?.name ?? '')
  const [birthday, setBirthday] = useState(mask?.birthday ?? '')
  const [height, setHeight] = useState(mask?.height ?? '')
  const [mbti, setMbti] = useState(mask?.mbti ?? '')
  const [likes, setLikes] = useState(mask?.likes ?? '')
  const [dislikes, setDislikes] = useState(mask?.dislikes ?? '')
  const [personality, setPersonality] = useState(mask?.personality ?? '')
  const [background, setBackground] = useState(mask?.background ?? '')
  const [otherSettings, setOtherSettings] = useState(mask?.otherSettings ?? '')

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setAvatar(r.result as string); r.readAsDataURL(file); e.target.value = ''
  }

  function handleSave() {
    if (!name.trim()) return
    const fields = { birthday, height, mbti, likes, dislikes, personality, background, otherSettings }
    const description = buildMaskDescription(name.trim(), fields)
    const data = { name: name.trim(), emoji: '🎭', avatar, description, ...fields }
    if (mask) updateUserMask(mask.id, data); else addUserMask(data)
    onBack()
  }

  return (
    <div className="absolute inset-0 z-40 bg-ios-bg flex flex-col animate-page-push">
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={onBack} className="text-[#25D366] text-[13px] font-bold active:opacity-60">取消</button>
        <h1 className="text-[15px] font-bold text-ios-text flex-1 text-center">{mask ? '编辑面具' : '新建面具'}</h1>
        <button onClick={handleSave} disabled={!name.trim()} className="text-[#25D366] text-[13px] font-bold active:opacity-60 disabled:opacity-30">保存</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 scrollbar-none">
        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-6">
          <button onClick={() => fileRef.current?.click()} className="relative active:opacity-80">
            {avatar ? (
              <img src={avatar} alt="" className="w-[72px] h-[72px] rounded-full object-cover" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-[#f0f0f0] flex items-center justify-center">
                <Camera className="w-7 h-7 text-[#bbb]" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-[24px] h-[24px] rounded-full bg-[#25D366] flex items-center justify-center shadow-sm">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          <p className="text-[11px] font-bold text-ios-text-secondary mt-2">点击上传头像</p>
        </div>

        {/* 基本信息 */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">基本信息</p>
        <div className="bg-card rounded-[14px] overflow-hidden mb-5">
          <div className="px-4 py-[11px] border-b border-ios-bg">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="面具名称（如：实习生、学姐…）"
              className="w-full bg-transparent text-[15px] font-bold text-ios-text outline-none placeholder:text-ios-text-secondary/40" />
          </div>
          <FormRow label="生日" value={birthday} onChange={setBirthday} placeholder="如 8月26日" />
          <FormRow label="身高" value={height} onChange={setHeight} placeholder="如 165cm" />
          <FormRow label="MBTI" value={mbti} onChange={setMbti} placeholder="如 INFP" />
        </div>

        {/* 喜好厌恶 */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">喜好厌恶</p>
        <div className="bg-card rounded-[14px] overflow-hidden mb-5">
          <div className="px-4 py-[11px] border-b border-ios-bg">
            <label className="text-[10px] font-bold text-[#25D366] mb-1 block">喜欢</label>
            <input value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="用逗号分隔，如 咖啡、读书、散步…"
              className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30" />
          </div>
          <div className="px-4 py-[11px]">
            <label className="text-[10px] font-bold text-red-400 mb-1 block">讨厌</label>
            <input value={dislikes} onChange={(e) => setDislikes(e.target.value)} placeholder="用逗号分隔…"
              className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30" />
          </div>
        </div>

        {/* 性格特点 */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">性格特点</p>
        <div className="bg-card rounded-[14px] px-4 py-[11px] mb-5">
          <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={3}
            placeholder="描述你的性格、说话方式、习惯…"
            className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30 leading-relaxed resize-none" />
        </div>

        {/* 背景经历 */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">背景经历</p>
        <div className="bg-card rounded-[14px] px-4 py-[11px] mb-5">
          <textarea value={background} onChange={(e) => setBackground(e.target.value)} rows={3}
            placeholder="你的成长背景、过去经历、与对方的缘起…"
            className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30 leading-relaxed resize-none" />
        </div>

        {/* 其他设定 */}
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">其他设定</p>
        <div className="bg-card rounded-[14px] px-4 py-[11px]">
          <textarea value={otherSettings} onChange={(e) => setOtherSettings(e.target.value)} rows={3}
            placeholder="口头禅、特殊习惯、你在对方眼中的形象…"
            className="w-full bg-transparent text-[13px] text-ios-text outline-none placeholder:text-ios-text-secondary/30 leading-relaxed resize-none" />
        </div>
      </div>
    </div>
  )
}

/* ─── Masks Sub-page ─── */
function MasksPage({ onBack }: { onBack: () => void }) {
  const { userMasks, removeUserMask } = usePhoneStore()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UserMask | undefined>()
  return (
    <div className="absolute inset-0 z-30 bg-ios-bg flex flex-col animate-page-push">
      <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
        <button onClick={onBack} className="text-[#25D366] active:opacity-60"><ChevronLeft className="w-7 h-7" /></button>
        <h1 className="text-[15px] font-bold text-ios-text flex-1 text-center pr-[28px]">My Personas</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 scrollbar-none">
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center gap-3 bg-card rounded-[14px] px-4 py-[12px] mb-4 active:opacity-80">
          <div className="w-[38px] h-[38px] rounded-full bg-[#25D366]/12 flex items-center justify-center shrink-0">
            <Plus className="w-[18px] h-[18px] text-[#25D366]" />
          </div>
          <p className="text-[14px] font-bold text-[#25D366]">New Persona</p>
        </button>
        {userMasks.length === 0 ? (
          <p className="text-[13px] font-medium text-ios-text-secondary text-center py-8">No personas yet</p>
        ) : (
          <div className="bg-card rounded-[14px] overflow-hidden">
            {userMasks.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-[11px] ${i < userMasks.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                {m.avatar ? (
                  <img src={m.avatar} alt="" className="w-[42px] h-[42px] rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-[42px] h-[42px] rounded-full bg-[#f0f0f0] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-[#ccc]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-ios-text">{m.name}</p>
                  {m.description && <p className="text-[11px] font-medium text-ios-text-secondary truncate">{m.description.slice(0,30)}</p>}
                </div>
                <button onClick={() => setEditing(m)} className="p-1 text-[#25D366] active:opacity-60 mr-1"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => removeUserMask(m.id)} className="p-1 text-red-400 active:opacity-60"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {(creating || editing !== undefined) && <MaskForm mask={editing} onBack={() => { setCreating(false); setEditing(undefined) }} />}
    </div>
  )
}

/* ─── Me Tab ─── */
function MeTab({ onShowMasks }: { onShowMasks: () => void }) {
  const { userMasks } = usePhoneStore()
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none pb-4">
      {/* Profile banner */}
      <div className="flex flex-col items-center pt-6 pb-5 px-4">
        <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#25D366]/30 to-[#25D366]/10 flex items-center justify-center mb-3">
          <UserCircle className="w-[48px] h-[48px] text-[#25D366]/60" strokeWidth={1.2} />
        </div>
        <p className="text-[17px] font-bold text-ios-text">我</p>
        <p className="text-[12px] text-ios-text-secondary mt-[3px]">点击设置头像和名称</p>
      </div>

      {/* Personas section */}
      <div className="px-4">
        <p className="text-[11px] font-bold text-ios-text-secondary uppercase px-1 mb-[6px]">面具</p>
        <div className="bg-card rounded-[14px] overflow-hidden mb-4">
          <button onClick={onShowMasks}
            className="w-full flex items-center gap-3 px-4 py-[13px] active:bg-ios-bg/50 transition-colors">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-[#25D366]/12 flex items-center justify-center shrink-0">
              <Users className="w-[17px] h-[17px] text-[#25D366]" strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-bold text-ios-text">我的面具</p>
              <p className="text-[11px] text-ios-text-secondary">{userMasks.length} 个身份设定</p>
            </div>
            <ChevronRight className="w-4 h-4 text-ios-text-secondary/40" />
          </button>
        </div>

        {/* Mask quick preview */}
        {userMasks.length > 0 && (
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {userMasks.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1 shrink-0">
                {m.avatar ? (
                  <img src={m.avatar} alt="" className="w-[50px] h-[50px] rounded-full object-cover" />
                ) : (
                  <div className="w-[50px] h-[50px] rounded-full bg-[#f0f0f0] flex items-center justify-center text-[22px]">{m.emoji}</div>
                )}
                <p className="text-[10px] font-bold text-ios-text-secondary text-center max-w-[50px] truncate">{m.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Friends Tab (朋友圈) ─── */
function FriendsTab({ showPublishModal, onClosePublishModal }: { showPublishModal: boolean; onClosePublishModal: () => void }) {
  const { moments, momentGroups, userMasks, addMoment, toggleMomentLike, addMomentComment } = usePhoneStore()
  const [momentContent, setMomentContent] = useState('')
  const [momentImage, setMomentImage] = useState<string | null>(null)
  const [momentVisibleTo, setMomentVisibleTo] = useState<'public' | string>('public')
  const [commentingMoment, setCommentingMoment] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const currentUser = { id: 'user', name: userMasks[0]?.name ?? '我', avatar: userMasks[0]?.avatar ?? userMasks[0]?.emoji ?? '👤' }
  const visibleMoments = moments

  function formatTime(ts: string) {
    const d = new Date(ts)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 60000
    if (diff < 1) return '刚刚'
    if (diff < 60) return `${Math.floor(diff)}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    if (diff < 43200) return `${Math.floor(diff / 1440)}天前`
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  function handlePublish() {
    if (!momentContent.trim()) return
    addMoment({
      authorId: currentUser.id,
      authorName: currentUser.name,
      avatar: typeof currentUser.avatar === 'string' && currentUser.avatar.length <= 8 ? currentUser.avatar : '👤',
      content: momentContent.trim(),
      imageUrl: momentImage ?? undefined,
      timestamp: new Date().toISOString(),
      visibleToGroupId: momentVisibleTo,
    })
    setMomentContent('')
    setMomentImage(null)
    setMomentVisibleTo('public')
    onClosePublishModal()
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = () => setMomentImage(r.result as string)
    r.readAsDataURL(file)
    e.target.value = ''
  }

  function submitComment() {
    if (!commentingMoment || !commentText.trim()) return
    addMomentComment(commentingMoment, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: commentText.trim(),
      timestamp: new Date().toISOString(),
    })
    setCommentText('')
    setCommentingMoment(null)
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-3 pb-4 space-y-3">
      {visibleMoments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-[14px] font-bold text-ios-text-secondary">还没有朋友圈</p>
          <p className="text-[12px] text-ios-text-secondary/60">点击右上角 + 发布第一条</p>
        </div>
      ) : (
        visibleMoments.map((m) => (
          <MomentCard
            key={m.id}
            moment={m}
            currentUserId="user"
            onLike={() => toggleMomentLike(m.id, 'user')}
            onComment={() => setCommentingMoment(m.id)}
            formatTime={formatTime}
          />
        ))
      )}

      {/* Publish modal */}
      {showPublishModal && (
        <div className="absolute inset-0 z-[60] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClosePublishModal}>
          <div className="bg-card rounded-t-[24px] flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-ios-bg shrink-0">
              <p className="text-[16px] font-bold text-ios-text">发布朋友圈</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <textarea value={momentContent} onChange={(e) => setMomentContent(e.target.value)}
                placeholder="这一刻的想法..." rows={4}
                className="w-full bg-ios-bg rounded-[12px] px-4 py-3 text-[14px] text-ios-text outline-none resize-none placeholder:text-ios-text-secondary/50" />
              {momentImage && (
                <div className="relative inline-block">
                  <img src={momentImage} alt="" className="w-[100px] h-[100px] object-cover rounded-[10px]" />
                  <button onClick={() => setMomentImage(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[14px]">×</button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <label htmlFor="moment-image-upload" className="flex items-center gap-2 text-[13px] text-ios-text-secondary active:opacity-70 cursor-pointer">
                  <ImagePlus className="w-5 h-5" strokeWidth={1.8} />
                  <span>上传图片</span>
                  <input id="moment-image-upload" ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ios-text-secondary">谁可以看</span>
                  <select value={momentVisibleTo} onChange={(e) => setMomentVisibleTo(e.target.value as 'public' | string)}
                    className="bg-ios-bg rounded-[8px] px-3 py-1.5 text-[13px] text-ios-text outline-none">
                    <option value="public">所有人</option>
                    {momentGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 pt-2 flex gap-3 border-t border-ios-bg shrink-0">
              <button onClick={onClosePublishModal} className="flex-1 py-3 rounded-[12px] bg-ios-bg text-ios-text font-bold text-[14px] active:opacity-70">取消</button>
              <button onClick={handlePublish} disabled={!momentContent.trim()}
                className="flex-1 py-3 rounded-[12px] bg-[#1a1a1a] text-white font-bold text-[14px] active:opacity-80 disabled:opacity-50">发布</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment input modal */}
      {commentingMoment && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setCommentingMoment(null)}>
          <div className="bg-card rounded-t-[20px] w-full p-4 pb-[max(env(safe-area-inset-bottom),20px)]" onClick={(e) => e.stopPropagation()}>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="写评论..."
              className="w-full bg-ios-bg rounded-[10px] px-4 py-3 text-[14px] text-ios-text outline-none mb-3" />
            <div className="flex gap-3">
              <button onClick={() => setCommentingMoment(null)} className="flex-1 py-2 rounded-[10px] bg-ios-bg text-ios-text font-bold text-[13px] active:opacity-70">取消</button>
              <button onClick={submitComment} disabled={!commentText.trim()}
                className="flex-1 py-2 rounded-[10px] bg-ios-blue text-white font-bold text-[13px] active:opacity-80 disabled:opacity-50">发送</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MomentCard({
  moment,
  currentUserId,
  onLike,
  onComment,
  formatTime,
}: {
  moment: Moment
  currentUserId: string
  onLike: () => void
  onComment: () => void
  formatTime: (ts: string) => string
}) {
  const isLiked = moment.likes.includes(currentUserId)
  return (
    <div className="bg-card rounded-[14px] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Avatar src={moment.avatar} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-ios-text">{moment.authorName}</p>
          <p className="text-[11px] text-ios-text-secondary">{formatTime(moment.timestamp)}</p>
        </div>
      </div>
      <p className="text-[13px] font-medium text-ios-text leading-relaxed mb-2">{moment.content}</p>
      {moment.imageUrl && (
        <img src={moment.imageUrl} alt="" className="w-full max-w-[200px] rounded-[10px] object-cover mb-2" />
      )}
      {moment.likes.length > 0 && (
        <div className="flex items-center gap-1 mb-2 text-[12px] text-ios-blue">
          <Heart className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
          <span>{moment.likes.length} 人赞</span>
        </div>
      )}
      {moment.comments.length > 0 && (
        <div className="space-y-1 mb-2 pl-0">
          {moment.comments.map((c) => (
            <p key={c.id} className="text-[12px] text-ios-text-secondary">
              <span className="font-bold text-ios-text">{c.authorName}</span>：{c.content}
            </p>
          ))}
        </div>
      )}
      <div className="flex gap-4 pt-2 border-t border-ios-bg/50">
        <button onClick={onLike} className={`flex items-center gap-1.5 text-[12px] font-medium active:opacity-70 ${isLiked ? 'text-red-500' : 'text-ios-text-secondary'}`}>
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} strokeWidth={1.5} />
          赞
        </button>
        <button onClick={onComment} className="flex items-center gap-1.5 text-[12px] font-medium text-ios-text-secondary active:opacity-70">
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          评论
        </button>
      </div>
    </div>
  )
}

/* ─── New Chat Modal (centered) ─── */
function NewChatModal({ show, onClose, onStart }: {
  show: boolean; onClose: () => void
  onStart: (maskId: string, charIds: string[], isGroup: boolean) => void
}) {
  const { userMasks, chars } = usePhoneStore()
  const [step, setStep] = useState(1)
  const [selectedMask, setSelectedMask] = useState<string | null>(null)
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [isGroup, setIsGroup] = useState(false)

  if (!show) return null

  function reset() { setStep(1); setSelectedMask(null); setSelectedChars([]); setIsGroup(false) }
  function handleClose() { reset(); onClose() }
  function handleStart() {
    if (!selectedMask || selectedChars.length === 0) return
    onStart(selectedMask, selectedChars, isGroup); reset(); onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card rounded-[20px] w-full max-w-[310px] overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '70vh', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ios-bg shrink-0">
          <div className="flex gap-[5px] items-center">
            <div className={`w-[7px] h-[7px] rounded-full transition-colors ${step >= 1 ? 'bg-[#25D366]' : 'bg-ios-bg'}`} />
            <div className={`w-[7px] h-[7px] rounded-full transition-colors ${step >= 2 ? 'bg-[#25D366]' : 'bg-ios-bg'}`} />
          </div>
          <p className="text-[14px] font-bold text-ios-text">{step === 1 ? 'Choose Persona' : 'Choose Character'}</p>
          <button onClick={handleClose} className="w-[24px] h-[24px] rounded-full bg-ios-bg flex items-center justify-center active:opacity-60">
            <X className="w-[13px] h-[13px] text-ios-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
          {step === 1 && (
            <div className="space-y-[8px]">
              <p className="text-[10px] font-bold text-ios-text-secondary mb-2">WHO WILL YOU BE?</p>
              {userMasks.map((m) => (
                <button key={m.id} onClick={() => setSelectedMask(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-[12px] transition-colors ${selectedMask === m.id ? 'bg-[#25D366]/12 ring-1 ring-[#25D366]' : 'bg-ios-bg active:opacity-80'}`}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" className="w-[38px] h-[38px] rounded-full object-cover shrink-0" />
                    : <div className="w-[38px] h-[38px] rounded-full bg-[#f0f0f0] flex items-center justify-center shrink-0 text-[20px]">{m.emoji}</div>}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-ios-text">{m.name}</p>
                    {m.description && <p className="text-[11px] font-medium text-ios-text-secondary truncate">{m.description.slice(0,30)}</p>}
                  </div>
                  {selectedMask === m.id && <Check className="w-4 h-4 text-[#25D366] shrink-0" />}
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="flex gap-2 mb-3">
                {[{ v: false, l: 'Private' }, { v: true, l: 'Group' }].map((opt) => (
                  <button key={opt.l} onClick={() => { setIsGroup(opt.v); if (!opt.v) setSelectedChars(selectedChars.slice(0, 1)) }}
                    className={`flex-1 py-[7px] rounded-[10px] text-[12px] font-bold transition-colors ${isGroup === opt.v ? 'bg-[#25D366] text-white' : 'bg-ios-bg text-ios-text-secondary'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-ios-text-secondary mb-2">{isGroup ? 'SELECT CHARACTERS' : 'SELECT A CHARACTER'}</p>
              <div className="space-y-[8px]">
                {chars.map((c) => {
                  const sel = selectedChars.includes(c.id)
                  return (
                    <button key={c.id} onClick={() => setSelectedChars(isGroup ? (sel ? selectedChars.filter((id) => id !== c.id) : [...selectedChars, c.id]) : [c.id])}
                      className={`w-full flex items-center gap-3 p-3 rounded-[12px] transition-colors ${sel ? 'bg-[#25D366]/12 ring-1 ring-[#25D366]' : 'bg-ios-bg active:opacity-80'}`}>
                      <Avatar src={c.avatar} size={36} />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-ios-text">{c.name}</p>
                        {c.corePrompt && <p className="text-[11px] font-medium text-[#25D366]">✓ 已整理</p>}
                      </div>
                      {sel && <Check className="w-4 h-4 text-[#25D366] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-5 pt-2 border-t border-ios-bg flex gap-2 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(1)} className="flex-1 py-[10px] rounded-[12px] bg-ios-bg text-[13px] font-bold text-ios-text-secondary active:opacity-80">Back</button>
          )}
          <button onClick={() => step === 1 ? (selectedMask && setStep(2)) : handleStart()}
            disabled={step === 1 ? !selectedMask : selectedChars.length === 0}
            className="flex-1 py-[10px] rounded-[12px] bg-[#25D366] text-white text-[13px] font-bold active:opacity-80 disabled:opacity-40 transition-opacity">
            {step === 1 ? 'Next →' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main App ─── */
const TABS: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'me', label: 'Me', icon: UserCircle },
]

export default function ChatApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)
  const createConversation = usePhoneStore((s) => s.createConversation)
  const darkMode = usePhoneStore((s) => s.darkMode)
  const [tab, setTab] = useState<Tab>('chats')
  const [filter, setFilter] = useState<Filter>('all')
  const [showNewChat, setShowNewChat] = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [showMasks, setShowMasks] = useState(false)
  const [showMomentPublish, setShowMomentPublish] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const headerStyle = darkMode
    ? { background: 'rgba(28,28,30,0.65)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }
    : { background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }

  function handleStartConv(maskId: string, charIds: string[], isGroup: boolean) {
    const id = createConversation(charIds, maskId, isGroup)
    setActiveConvId(id)
  }

  return (
    <div className="relative flex flex-col h-full bg-ios-bg overflow-hidden">
      <div className="flex items-center px-4 pt-[48px] pb-1 shrink-0 z-10" style={headerStyle}>
        <button onClick={closeApp} className="text-[#25D366] active:opacity-60"><ChevronLeft className="w-7 h-7" /></button>
        <h1 className="text-[16px] font-bold text-ios-text flex-1 text-center">{TABS.find((t) => t.id === tab)?.label}</h1>
        <div className="flex items-center gap-[10px]">
          {tab === 'chats' && (
            <>
              <button onClick={() => setEditMode(!editMode)} className="active:opacity-60">
                {editMode
                  ? <span className="text-[13px] font-bold text-[#25D366]">完成</span>
                  : <Edit3 className="w-[18px] h-[18px] text-[#25D366]" />}
              </button>
              {!editMode && (
                <button onClick={() => setShowNewChat(true)} className="active:opacity-60">
                  <Plus className="w-[22px] h-[22px] text-[#25D366]" strokeWidth={2.2} />
                </button>
              )}
            </>
          )}
          {tab === 'friends' && (
            <button onClick={() => setShowMomentPublish(true)} className="active:opacity-60">
              <Plus className="w-[22px] h-[22px] text-[#25D366]" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {tab === 'chats' && <FilterBar active={filter} onChange={setFilter} />}
      {tab === 'chats' && <ChatsTab filter={filter} onOpen={setActiveConvId} editMode={editMode} />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'friends' && <FriendsTab showPublishModal={showMomentPublish} onClosePublishModal={() => setShowMomentPublish(false)} />}
      {tab === 'me' && <MeTab onShowMasks={() => setShowMasks(true)} />}

      <div className="shrink-0 bg-header border-t border-ios-bg/50 z-10">
        <div className="flex justify-around items-center pt-[7px] pb-[20px]">
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-[2px] active:opacity-70 min-w-[56px]">
                <Icon className={`w-[21px] h-[21px] ${active ? 'text-[#25D366]' : 'text-ios-text-secondary'}`} strokeWidth={active ? 2.2 : 1.6} />
                <span className={`text-[10px] font-bold ${active ? 'text-[#25D366]' : 'text-ios-text-secondary'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeConvId && <ChatConversation convId={activeConvId} onBack={() => setActiveConvId(null)} />}
      {showMasks && <MasksPage onBack={() => setShowMasks(false)} />}
      <NewChatModal show={showNewChat} onClose={() => setShowNewChat(false)} onStart={handleStartConv} />
    </div>
  )
}
