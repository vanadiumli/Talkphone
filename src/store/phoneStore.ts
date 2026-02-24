import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DialogExample {
  user: string   // what the other person says
  reply: string  // character's reply (use ||| for multiple bubbles, [sticker:emoji] for sticker)
}

export interface MemoryChunk {
  tags: string[]   // keywords that trigger retrieval
  content: string  // the memory/experience snippet
}

export interface AIChar {
  id: string
  name: string
  avatar: string
  rawPersona?: string              // user's original free-text input (editable)
  // structured fields auto-extracted by AI from rawPersona
  corePrompt?: string              // 100-200 chars: personality core, speaking rhythm
  dialogExamples?: DialogExample[] // Show-don't-Tell examples
  memoryChunks?: MemoryChunk[]     // RAG memory library
  // v1 legacy fields (kept for backward compat)
  persona?: string
  birthday?: string; height?: string; mbti?: string
  likes?: string; dislikes?: string
  personality?: string; background?: string; otherSettings?: string
  /** MiniMax 音色 ID，用于 AI 语音克隆（T2A） */
  cloneVoiceId?: string
}

export interface UserMask {
  id: string; name: string; emoji: string; description: string
  avatar?: string
  // Structured persona fields (same as AIChar)
  birthday?: string; height?: string; mbti?: string
  likes?: string; dislikes?: string
  personality?: string; background?: string; otherSettings?: string
}
export interface ConvMessage {
  id: string; text: string; time: string; role: 'user' | 'assistant'
  charId?: string        // which AIChar sent this message (group chats)
  type?: 'text' | 'transfer' | 'sticker'
  transferAmount?: number; transferNote?: string; transferAccepted?: boolean
  stickerUrl?: string
  reactions?: string[]
  unsent?: boolean; unsentText?: string
  quotedText?: string       // quoted message text (displayed inside bubble)
  quotedSenderName?: string // name of the quoted sender
}
export interface JournalEntry { id: string; date: string; mood: string; content: string; open: boolean }
export interface JournalMonth { id: string; month: string; summary: string; entries: JournalEntry[] }

/** 情感温度：用户可设定，影响 AI 对用户的态度 */
export const AFFECTION_STAGES = ['陌生人', '破冰期', '熟悉', '暧昧', '灵魂伴侣'] as const
/** 手帐碎片：每天可有多条，每条约 100 字 */
export interface HandEntry { id: string; date: string; content: string }
export interface DailyDiary { date: string; content: string }
export interface MonthlyDiary { month: string; content: string }

/** 每个角色独立的记忆区 */
export interface CharMemory {
  impressionTags: string[]
  impressionMonologue: string
  handEntries: HandEntry[]
  dailyDiaries: DailyDiary[]
  monthlyDiaries: MonthlyDiary[]
  affectionTemp?: number
  lastRefinedMessageCount?: number
}

export interface MusicTrack {
  id: string
  name: string
  artist: string
  blobUrl: string   // temporary blob URL — not persisted
  duration: number  // seconds, 0 if unknown
  liked: boolean
}

/** 世界书：世界设定，AI 回复时读取 */
export interface WorldBookFolder {
  id: string
  name: string
}
export interface WorldBook {
  id: string
  name: string
  content: string
  folderId: string | null
}

/** 朋友圈 */
export interface MomentComment {
  id: string
  authorId: string
  authorName: string
  content: string
  timestamp: string
  replyToCommentId?: string
}
export interface Moment {
  id: string
  authorId: string
  authorName: string
  avatar: string
  content: string
  imageUrl?: string
  imageDescription?: string
  timestamp: string
  likes: string[]
  comments: MomentComment[]
  visibleToGroupId: 'public' | string
}
export interface MomentGroup {
  id: string
  name: string
  memberIds: string[]
}

/** 论坛帖子 */
export interface ForumPost {
  id: string
  content: string
  authorId?: string
  authorName: string
  imageUrl?: string
  timestamp: string
  section: 'following' | 'recommended' | 'gossip'
}

export interface Conversation {
  id: string; charIds: string[]; maskId: string; messages: ConvMessage[]
  isGroup: boolean; nickname?: string; background?: string; unread: number
  pinned?: boolean       // pinned to top of chat list
  hidden?: boolean       // hidden from main chat list
  relationshipStage: number  // 0-4: 陌生人→灵魂伴侣
  /** 情感温度：用户可手动设定（legacy，单角色时用） */
  affectionTemp?: number
  impressionTags: string[]
  impressionMonologue: string
  journalMonths: JournalMonth[]
  handEntries?: HandEntry[]
  dailyDiaries?: DailyDiary[]
  monthlyDiaries?: MonthlyDiary[]
  /** 每个角色独立的记忆区，key=charId */
  charMemories?: Record<string, CharMemory>
  /** 绑定的世界书 ID 列表，AI 回复时注入 */
  worldBookIds?: string[]
}

interface ApiSettings {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  /** 启用后，记忆/总结类任务使用 summaryModel，对话仍用 model */
  advancedApiEnabled?: boolean
  /** 记忆总结等用的便宜小模型，如 gpt-4o-mini */
  summaryModel?: string
  /** 记忆/总结用模型的温度，默认 0.7 */
  summaryTemperature?: number
}

interface PhoneState {
  currentApp: string | null; closingApp: boolean; time: string; batteryLevel: number
  polaroidPhoto: string | null; darkMode: boolean; wallpaper: string | null; customIcons: Record<string, string>
  apiSettings: ApiSettings
  /** MiniMax T2A 克隆音色：开启后 AI 回复可播放为指定音色 */
  cloneVoiceSettings: { enabled: boolean; groupId: string; apiKey: string }
  // Music (in-memory only, not persisted)
  playlist: MusicTrack[]; currentTrackIndex: number; isPlaying: boolean
  addTrack: (t: Omit<MusicTrack, 'id'>) => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, u: Partial<MusicTrack>) => void
  setCurrentTrack: (idx: number) => void
  setIsPlaying: (v: boolean) => void
  neteaseApiUrl: string
  chars: AIChar[]; userMasks: UserMask[]; conversations: Conversation[]
  customStickers: string[]

  worldBookFolders: WorldBookFolder[]; worldBooks: WorldBook[]
  addWorldBookFolder: (f: Omit<WorldBookFolder, 'id'>) => void
  addWorldBook: (w: Omit<WorldBook, 'id'>) => void
  updateWorldBook: (id: string, u: Partial<WorldBook>) => void
  removeWorldBook: (id: string) => void
  removeWorldBookFolder: (id: string) => void

  moments: Moment[]; momentGroups: MomentGroup[]
  addMoment: (m: Omit<Moment, 'id' | 'likes' | 'comments'>) => void
  toggleMomentLike: (momentId: string, userId: string) => void
  addMomentComment: (momentId: string, c: Omit<MomentComment, 'id'>) => void

  forumPosts: ForumPost[]
  addForumPost: (p: Omit<ForumPost, 'id'>) => void

  openApp: (appId: string) => void; closeApp: () => void
  setTime: (t: string) => void; setPolaroidPhoto: (url: string) => void
  setApiSettings: (s: Partial<ApiSettings>) => void
  setCloneVoiceSettings: (s: Partial<PhoneState['cloneVoiceSettings']>) => void
  setNeteaseApiUrl: (url: string) => void
  setDarkMode: (v: boolean) => void; setWallpaper: (url: string | null) => void
  setCustomIcon: (appId: string, url: string) => void; removeCustomIcon: (appId: string) => void

  addChar: (c: Omit<AIChar, 'id'>) => void
  updateChar: (id: string, u: Partial<AIChar>) => void
  removeChar: (id: string) => void
  addUserMask: (m: Omit<UserMask, 'id'>) => void
  updateUserMask: (id: string, u: Partial<UserMask>) => void
  removeUserMask: (id: string) => void
  createConversation: (charIds: string[], maskId: string, isGroup: boolean) => string
  addMessage: (convId: string, msg: Omit<ConvMessage, 'id'>) => void
  updateMessage: (convId: string, msgId: string, u: Partial<ConvMessage>) => void
  removeMessage: (convId: string, msgId: string) => void
  clearConversationMessages: (convId: string) => void
  updateConversation: (id: string, u: Partial<Omit<Conversation, 'id' | 'messages' | 'charIds' | 'maskId' | 'isGroup'>>) => void
  updateCharMemory: (convId: string, charId: string, u: Partial<CharMemory>) => void
  removeConversation: (id: string) => void
  togglePinConversation: (id: string) => void
  toggleHideConversation: (id: string) => void
  addCustomSticker: (url: string) => void
  removeCustomSticker: (idx: number) => void
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 获取某角色在某对话中的记忆（含 legacy 兼容） */
export function getCharMemory(conv: Conversation | undefined, charId: string): CharMemory | null {
  if (!conv) return null
  const cm = conv.charMemories?.[charId]
  if (cm) return cm
  if (conv.charIds.includes(charId)) {
    return {
      impressionTags: conv.impressionTags ?? [],
      impressionMonologue: conv.impressionMonologue ?? '',
      handEntries: conv.handEntries ?? [],
      dailyDiaries: conv.dailyDiaries ?? [],
      monthlyDiaries: conv.monthlyDiaries ?? [],
      affectionTemp: conv.affectionTemp ?? conv.relationshipStage,
      lastRefinedMessageCount: 0,
    }
  }
  return null
}

export function getCurrentTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
}

export function buildMaskDescription(name: string, m: Partial<UserMask>): string {
  const parts = [`用户正在以【${name}】这个身份与你交流。`]
  const basic: string[] = []
  if (m.birthday) basic.push(`生日：${m.birthday}`)
  if (m.height) basic.push(`身高：${m.height}`)
  if (m.mbti) basic.push(`MBTI：${m.mbti}`)
  if (basic.length) parts.push(`【基础信息】\n${basic.join('　')}`)
  const pref: string[] = []
  if (m.likes) pref.push(`喜欢：${m.likes}`)
  if (m.dislikes) pref.push(`不喜欢：${m.dislikes}`)
  if (pref.length) parts.push(`【喜好厌恶】\n${pref.join('\n')}`)
  if (m.personality) parts.push(`【性格特点】\n${m.personality}`)
  if (m.background) parts.push(`【背景经历】\n${m.background}`)
  if (m.otherSettings) parts.push(`【其他设定】\n${m.otherSettings}`)
  return parts.join('\n\n')
}

export function buildCharPersona(name: string, c: Partial<AIChar>): string {
  // ── Identity block ──
  let identity: string
  if (c.corePrompt) {
    identity = `你是${name}。${c.corePrompt}`
  } else if (c.rawPersona) {
    // User entered raw persona but AI hasn't processed it yet
    identity = `你是${name}。\n${c.rawPersona}`
  } else {
    // v1 legacy fallback
    const lines = [`你是${name}。`]
    const basic = [c.birthday && `生日：${c.birthday}`, c.height && `身高：${c.height}`, c.mbti && `MBTI：${c.mbti}`].filter(Boolean)
    if (basic.length) lines.push(`基础信息：${basic.join('，')}`)
    if (c.likes) lines.push(`喜欢：${c.likes}`)
    if (c.dislikes) lines.push(`讨厌：${c.dislikes}`)
    if (c.personality) lines.push(`性格：${c.personality}`)
    if (c.background) lines.push(`背景：${c.background}`)
    if (c.otherSettings) lines.push(`其他：${c.otherSettings}`)
    identity = lines.join('\n')
  }

  // ── Dialog examples (Show, don't Tell) ──
  const validExamples = (c.dialogExamples ?? []).filter(e => e.user.trim() && e.reply.trim())
  const examplesPart = validExamples.length > 0
    ? `【说话风格——照这些例子学语气节奏】\n` +
      validExamples.slice(0, 6).map(e => `"${e.user}" → ${e.reply}`).join('\n')
    : ''

  const formatPart = `【回复格式】
直接输出你要说的话。多条消息用|||分隔。不要使用任何XML标签。

核心：每条气泡只放一个短句（3-15字），像微信聊天截图。禁止在一个气泡里塞一大段话。
规则：话少时1条，普通2-3条，有情绪3-5条，极少超5条。口语化，可以省主语、不说完整句、语序颠倒。标点是语气的一部分："……"犹豫，"？"疑惑，"。"冷淡。语气词（嗯、啊、哈、呀、吧、嘛）看性格用。
emoji：大多数回复不要带emoji。只在真正需要的时候偶尔用一个，直接打emoji字符（如😂），不要用任何特殊格式。10条消息里最多1-2条带emoji。
禁止：AI客服腔·总结复述·书面语·承认是AI·对用户使用"滚""疯了""闭嘴""去死"等攻击性词语（调侃除外）。没什么可说时直接"哦"或"嗯"。`

  return [identity, examplesPart, formatPart].filter(Boolean).join('\n\n')
}

/** 构建记忆块，按读取顺序：温度 → 印象 → 手帐 → 事件型。控制 token，按需读取。 */
export function buildMemoryPrompt(
  _charName: string,
  charMemory: CharMemory | null,
  relationshipStage: number,
  char: Pick<AIChar, 'memoryChunks'>,
  history: { text: string }[],
): string[] {
  if (!charMemory) return []
  const parts: string[] = []

  // 1. 温度：优先读取，决定对待用户的态度
  const temp = charMemory.affectionTemp ?? relationshipStage
  const stage = AFFECTION_STAGES[Math.min(temp, 4)] ?? '熟悉'
  const tempGuide: Record<string, string> = {
    '陌生人': '你对用户是陌生人态度：话少、有防备、敷衍，不主动分享。',
    '破冰期': '你刚和用户熟一点：会接话、偶尔分享，但还不太放得开。',
    '熟悉': '你和用户是朋友：会互相分享生活，自然交流。',
    '暧昧': '你和用户有些暧昧：会有令人心动的话语，语气更亲密。',
    '灵魂伴侣': '你和用户是爱人/灵魂伴侣：再冷淡的人也会撒娇，信任且亲密。',
  }
  parts.push(`【情感温度·对待用户的态度】\n${tempGuide[stage] ?? tempGuide['熟悉']}`)

  // 2. 印象标签（信念型）
  const tags = charMemory.impressionTags ?? []
  if (tags.length > 0) {
    parts.push(`【你对用户的印象】\n${tags.slice(0, 8).join('、')}`)
  }

  // 3. 手帐：近期状态型记忆（日日记→月日记→手帐碎片）
  const daily = charMemory.dailyDiaries ?? []
  const monthly = charMemory.monthlyDiaries ?? []
  const hands = charMemory.handEntries ?? []
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const thisMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`

  const recentDaily = daily.slice(-3)
  const recentMonthly = monthly.filter((m) => m.month === thisMonth).slice(-1)
  const recentHands = hands.filter((h) => h.date === today || h.date.endsWith(today.slice(5))).slice(-5)

  if (recentDaily.length) {
    parts.push(`【近期日日记】\n${recentDaily.map((d) => d.content.slice(0, 80)).join('\n')}`)
  }
  if (recentMonthly.length) {
    parts.push(`【近期月记】\n${recentMonthly[0].content.slice(0, 120)}`)
  }
  if (recentHands.length) {
    parts.push(`【今日手帐碎片】\n${recentHands.map((h) => h.content).join('；')}`)
  }

  // 4. 事件型：memoryChunks 按话题触发，影响人格而非无意义复用
  const chunks = char.memoryChunks ?? []
  if (chunks.length > 0) {
    const recent = history.slice(-6).map((m) => m.text).join(' ').toLowerCase()
    const hits = chunks.filter((c) => c.tags.some((t) => recent.includes(t.toLowerCase()))).slice(0, 3)
    if (hits.length) {
      parts.push(`【相关经历（自然融入，勿生硬引用）】\n${hits.map((h) => h.content).join('\n')}`)
    }
  }

  return parts.filter(Boolean)
}

const DEFAULT_CHARS: AIChar[] = [
  {
    id: 'char-1',
    name: 'Lu Chen',
    avatar: '🌙',
    corePrompt: '说话简洁内敛，句子很短，偶尔用一两个文学意象。不主动闲聊，但聊起来有种说不清的温度。表面平静，内心比外表复杂得多。习惯深夜活动，白天有时会消失很久。对不喜欢的话题直接无视或岔开话题。',
    dialogExamples: [
      { user: '在吗', reply: '在' },
      { user: '今天好累', reply: '嗯|||累了就歇' },
      { user: '你喜欢什么样的人', reply: '没想过|||大概是不需要解释什么的人' },
      { user: '你在干嘛', reply: '发呆|||或者看书 分不清' },
      { user: '我好无聊', reply: '……' },
      { user: '好想见你', reply: '……|||少说这种话' },
      { user: '你不关心我', reply: '？|||我什么时候不关心了' },
    ],
    memoryChunks: [
      { tags: ['书', '文学', '读书', '诗', '翻译', '写作'], content: '从小在图书馆长大，做过几年文学翻译，现在是自由撰稿人。喜欢波伏娃、卡夫卡、博尔赫斯。' },
      { tags: ['夜晚', '深夜', '失眠', '熬夜', '凌晨'], content: '习惯凌晨1点后才睡，有时通宵。觉得只有深夜才属于自己，不喜欢被打扰。' },
      { tags: ['家', '父母', '童年', '原生家庭', '小时候'], content: '父母早年分居，基本一个人长大。不主动提家里的事，但偶尔会流露出某种习惯性的孤独。' },
    ],
  },
  {
    id: 'char-2',
    name: 'Lin Zhiyu',
    avatar: '🌸',
    corePrompt: '热情开朗，容易兴奋，说话快，喜欢分享生活里的细节。语气里有真实的温度。但被冷落或忽视时，会突然安静——她绝不会说"我不开心"，但你能感觉到。',
    dialogExamples: [
      { user: '在吗', reply: '在啊！|||怎么了快说' },
      { user: '今天好累', reply: '啊怎么了|||发生什么事了' },
      { user: '你今天干嘛了', reply: '刚从展览出来！！|||超好看的 要看吗我发你图' },
      { user: '我不开心', reply: '哎|||说说看' },
      { user: '没事', reply: '你确定？|||感觉不像没事' },
      { user: '随便', reply: '……|||你这人' },
      { user: '好想你', reply: '哎呀|||我也是' },
    ],
    memoryChunks: [
      { tags: ['拍照', '摄影', '相机', '照片', '拍'], content: '艺术设计专业，有自己的小众摄影博客，专拍城市里被遗忘的角落。' },
      { tags: ['展览', '画廊', '艺术', '博物馆', '美术'], content: '每周至少去一次展览，对新开画廊如数家珍，经常拉朋友一起去。' },
      { tags: ['早晨', '早起', '早安', '睡觉', '起床'], content: '早睡早起型，习惯给朋友发早安。晚上11点后基本不回消息了。' },
    ],
  },
]

const DEFAULT_MASKS: UserMask[] = [
  { id: 'mask-1', name: 'Default', emoji: '🧑', description: '就是你自己，自然相处。' },
]

export const usePhoneStore = create<PhoneState>()(
  persist(
    (set: import('zustand').StoreApi<PhoneState>['setState']) => ({
      currentApp: null, closingApp: false, time: getCurrentTime(),
      batteryLevel: 79, polaroidPhoto: null, darkMode: false, wallpaper: null, customIcons: {},
      apiSettings: { baseUrl: '', apiKey: '', model: '', temperature: 0.7, advancedApiEnabled: false, summaryModel: 'gpt-4o-mini', summaryTemperature: 0.7 },
      cloneVoiceSettings: { enabled: false, groupId: '', apiKey: '' },
      neteaseApiUrl: '',
      chars: DEFAULT_CHARS,
      userMasks: DEFAULT_MASKS,
      conversations: [],
      customStickers: [],
      worldBookFolders: [],
      worldBooks: [],
      moments: [],
      momentGroups: [],
      forumPosts: [],
      playlist: [], currentTrackIndex: 0, isPlaying: false,
      addTrack: (t: Omit<MusicTrack, 'id'>) => set((s) => ({ playlist: [...s.playlist, { ...t, id: `track-${Date.now()}` }] })),
      removeTrack: (id: string) => set((s) => ({ playlist: s.playlist.filter((t) => t.id !== id), currentTrackIndex: Math.min(s.currentTrackIndex, Math.max(0, s.playlist.length - 2)) })),
      updateTrack: (id: string, u: Partial<MusicTrack>) => set((s) => ({ playlist: s.playlist.map((t) => t.id === id ? { ...t, ...u } : t) })),
      setCurrentTrack: (idx: number) => set({ currentTrackIndex: idx, isPlaying: true }),
      setIsPlaying: (v: boolean) => set({ isPlaying: v }),

      openApp: (appId: string) => set({ currentApp: appId, closingApp: false }),
      closeApp: () => { set({ closingApp: true }); setTimeout(() => set({ currentApp: null, closingApp: false }), 350) },
      setTime: (time: string) => set({ time }),
      setPolaroidPhoto: (url: string) => set({ polaroidPhoto: url }),
      setApiSettings: (s: Partial<ApiSettings>) => set((state) => ({ apiSettings: { ...state.apiSettings, ...s } })),
      setCloneVoiceSettings: (s: Partial<{ enabled: boolean; groupId: string; apiKey: string }>) => set((state) => ({ cloneVoiceSettings: { ...state.cloneVoiceSettings, ...s } })),
      setNeteaseApiUrl: (url: string) => set({ neteaseApiUrl: url }),
      setDarkMode: (v: boolean) => set({ darkMode: v }),
      setWallpaper: (url: string | null) => set({ wallpaper: url }),
      setCustomIcon: (appId: string, url: string) => set((s) => ({ customIcons: { ...s.customIcons, [appId]: url } })),
      removeCustomIcon: (appId: string) => set((s) => { const next = { ...s.customIcons }; delete next[appId]; return { customIcons: next } }),

      addChar: (c: Omit<AIChar, 'id'>) => set((s) => ({ chars: [...s.chars, { ...c, id: `char-${Date.now()}` }] })),
      updateChar: (id: string, u: Partial<AIChar>) => set((s) => ({ chars: s.chars.map((c) => c.id === id ? { ...c, ...u } : c) })),
      removeChar: (id: string) => set((s) => ({ chars: s.chars.filter((c) => c.id !== id) })),
      addUserMask: (m: Omit<UserMask, 'id'>) => set((s) => ({ userMasks: [...s.userMasks, { ...m, id: `mask-${Date.now()}` }] })),
      updateUserMask: (id: string, u: Partial<UserMask>) => set((s) => ({ userMasks: s.userMasks.map((m) => m.id === id ? { ...m, ...u } : m) })),
      removeUserMask: (id: string) => set((s) => ({ userMasks: s.userMasks.filter((m) => m.id !== id) })),

      createConversation: (charIds: string[], maskId: string, isGroup: boolean) => {
        const id = `conv-${Date.now()}`
        set((s) => ({ conversations: [...s.conversations, { id, charIds, maskId, messages: [], isGroup, unread: 0, relationshipStage: 0, impressionTags: [], impressionMonologue: '', journalMonths: [] }] }))
        return id
      },
      addMessage: (convId: string, msg: Omit<ConvMessage, 'id'>) => set((s) => ({
        conversations: s.conversations.map((conv) => {
          if (conv.id !== convId) return conv
          const newMessages = [...conv.messages, { ...msg, id: `msg-${Date.now()}-${Math.random()}` }]
          // Auto-compute relationship stage (thresholds: 5, 20, 50, 100 AI replies)
          const aiCount = newMessages.filter((m) => m.role === 'assistant').length
          const THRESHOLDS = [0, 5, 20, 50, 100]
          let stage = 0
          for (let i = THRESHOLDS.length - 1; i >= 0; i--) { if (aiCount >= THRESHOLDS[i]) { stage = i; break } }
          return { ...conv, messages: newMessages, relationshipStage: stage }
        }),
      })),
      updateMessage: (convId: string, msgId: string, u: Partial<ConvMessage>) => set((s) => ({
        conversations: s.conversations.map((conv) => conv.id !== convId ? conv : {
          ...conv, messages: conv.messages.map((m) => m.id !== msgId ? m : { ...m, ...u })
        }),
      })),
      removeMessage: (convId: string, msgId: string) => set((s) => ({
        conversations: s.conversations.map((conv) => conv.id !== convId ? conv : {
          ...conv, messages: conv.messages.filter((m) => m.id !== msgId)
        }),
      })),
      clearConversationMessages: (convId: string) => set((s) => ({
        conversations: s.conversations.map((conv) => conv.id !== convId ? conv : { ...conv, messages: [] }),
      })),
      updateConversation: (id: string, u: Partial<Omit<Conversation, 'id' | 'messages' | 'charIds' | 'maskId' | 'isGroup'>>) => set((s) => ({
        conversations: s.conversations.map((conv) => conv.id === id ? { ...conv, ...u } : conv),
      })),
      updateCharMemory: (convId: string, charId: string, u: Partial<CharMemory>) => set((s) => ({
        conversations: s.conversations.map((conv) => {
          if (conv.id !== convId) return conv
          const prev: Partial<CharMemory> = conv.charMemories?.[charId] ?? {}
          const next: CharMemory = {
            impressionTags: prev.impressionTags ?? conv.impressionTags ?? [],
            impressionMonologue: prev.impressionMonologue ?? conv.impressionMonologue ?? '',
            handEntries: prev.handEntries ?? conv.handEntries ?? [],
            dailyDiaries: prev.dailyDiaries ?? conv.dailyDiaries ?? [],
            monthlyDiaries: prev.monthlyDiaries ?? conv.monthlyDiaries ?? [],
            affectionTemp: prev.affectionTemp ?? conv.affectionTemp,
            lastRefinedMessageCount: prev.lastRefinedMessageCount,
            ...u,
          }
          return {
            ...conv,
            charMemories: { ...conv.charMemories, [charId]: next },
          }
        }),
      })),
      removeConversation: (id: string) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
      togglePinConversation: (id: string) => set((s) => ({ conversations: s.conversations.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c) })),
      toggleHideConversation: (id: string) => set((s) => ({ conversations: s.conversations.map((c) => c.id === id ? { ...c, hidden: !c.hidden } : c) })),
      addCustomSticker: (url: string) => set((s) => ({ customStickers: [...s.customStickers, url] })),
      removeCustomSticker: (idx: number) => set((s) => ({ customStickers: s.customStickers.filter((_, i) => i !== idx) })),

      addWorldBookFolder: (f: Omit<WorldBookFolder, 'id'>) => set((s) => ({ worldBookFolders: [...s.worldBookFolders, { ...f, id: generateId() }] })),
      addWorldBook: (w: Omit<WorldBook, 'id'>) => set((s) => ({ worldBooks: [...s.worldBooks, { ...w, id: generateId() }] })),
      updateWorldBook: (id: string, u: Partial<WorldBook>) => set((s) => ({ worldBooks: s.worldBooks.map((w) => w.id === id ? { ...w, ...u } : w) })),
      removeWorldBook: (id: string) => set((s) => ({ worldBooks: s.worldBooks.filter((w) => w.id !== id) })),
      removeWorldBookFolder: (id: string) => set((s) => ({
        worldBookFolders: s.worldBookFolders.filter((f) => f.id !== id),
        worldBooks: s.worldBooks.map((w) => w.folderId === id ? { ...w, folderId: null } : w),
      })),

      addMoment: (m: Omit<Moment, 'id' | 'likes' | 'comments'>) => set((s) => ({
        moments: [{ ...m, id: generateId(), likes: [], comments: [] }, ...s.moments],
      })),
      toggleMomentLike: (momentId: string, userId: string) => set((s) => ({
        moments: s.moments.map((mom) => {
          if (mom.id !== momentId) return mom
          const has = mom.likes.includes(userId)
          return { ...mom, likes: has ? mom.likes.filter((u) => u !== userId) : [...mom.likes, userId] }
        }),
      })),
      addMomentComment: (momentId: string, c: Omit<MomentComment, 'id'>) => set((s) => ({
        moments: s.moments.map((mom) =>
          mom.id !== momentId
            ? mom
            : { ...mom, comments: [...mom.comments, { ...c, id: generateId() }] }
        ),
      })),

      addForumPost: (p: Omit<ForumPost, 'id'>) => set((s) => ({
        forumPosts: [{ ...p, id: generateId() }, ...s.forumPosts],
      })),
    }),
    {
      name: 'webphone-storage',
      partialize: (state) => ({
        polaroidPhoto: state.polaroidPhoto, apiSettings: state.apiSettings,
        cloneVoiceSettings: state.cloneVoiceSettings,
        neteaseApiUrl: state.neteaseApiUrl,
        darkMode: state.darkMode, wallpaper: state.wallpaper,
        customIcons: state.customIcons, chars: state.chars, userMasks: state.userMasks,
        conversations: state.conversations, customStickers: state.customStickers,
        worldBookFolders: state.worldBookFolders, worldBooks: state.worldBooks,
        moments: state.moments, momentGroups: state.momentGroups,
        forumPosts: state.forumPosts,
      }),
      merge: (persisted: any, current: any) => {
        const p = persisted as Partial<typeof current>
        // Ensure old conversations have new fields
        if (p.conversations) {
          p.conversations = p.conversations.map((c: any) => ({
            ...c,
            relationshipStage: c.relationshipStage ?? 0,
            impressionTags: c.impressionTags ?? [],
            impressionMonologue: c.impressionMonologue ?? '',
            journalMonths: c.journalMonths ?? [],
            pinned: c.pinned ?? false,
            hidden: c.hidden ?? false,
            charMemories: c.charMemories ?? {},
            worldBookIds: c.worldBookIds ?? [],
          }))
        }
        if (!p.customStickers) p.customStickers = []
        // Ensure existing chars have new v2 fields
        if (p.chars) {
          p.chars = p.chars.map((c: any) => ({
            ...c,
            rawPersona: c.rawPersona ?? '',
            corePrompt: c.corePrompt ?? '',
            dialogExamples: c.dialogExamples ?? [],
            memoryChunks: c.memoryChunks ?? [],
          }))
        }
        if (!p.worldBookFolders) p.worldBookFolders = []
        if (!p.worldBooks) p.worldBooks = []
        if (!p.moments) p.moments = []
        if (!p.momentGroups) p.momentGroups = []
        if (!p.forumPosts) p.forumPosts = []
        if (!p.cloneVoiceSettings) p.cloneVoiceSettings = { enabled: false, groupId: '', apiKey: '' }
        return { ...current, ...p }
      },
    }
  )
)
