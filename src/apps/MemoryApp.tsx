import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Pencil, Sparkles, Loader } from 'lucide-react'
import { usePhoneStore, AFFECTION_STAGES, getCharMemory, type JournalMonth, type JournalEntry, type HandEntry } from '../store/phoneStore'

type MemTab = 'impression' | 'journal' | 'traces'

function Avatar({ src, size = 48 }: { src: string; size?: number }) {
  const isEmoji = /^\p{Emoji}/u.test(src) && src.length <= 8
  if (isEmoji)
    return <div className="rounded-full bg-[#f0f0f0] flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.46 }}>{src}</div>
  return <img src={src} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
}

function CalendarView({
  calendarDate,
  setCalendarDate,
  selectedDay,
  setSelectedDay,
  handEntries,
}: {
  calendarDate: string
  setCalendarDate: (s: string) => void
  selectedDay: string | null
  setSelectedDay: (s: string | null) => void
  handEntries: HandEntry[]
}) {
  const [y, m] = calendarDate.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const startPad = first.getDay()
  const days = last.getDate()
  const hasEntry = (d: number) => handEntries.some((h) => h.date === `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  const prevMonth = () => {
    if (m === 1) setCalendarDate(`${y - 1}-12`)
    else setCalendarDate(`${y}-${String(m - 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    if (m === 12) setCalendarDate(`${y + 1}-01`)
    else setCalendarDate(`${y}-${String(m + 1).padStart(2, '0')}`)
  }
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 active:opacity-60"><ChevronLeft className="w-4 h-4 text-ios-text-secondary" /></button>
        <span className="text-[13px] font-bold text-ios-text">{y}年{m}月</span>
        <button onClick={nextMonth} className="p-1 active:opacity-60"><ChevronRight className="w-4 h-4 text-ios-text-secondary" /></button>
      </div>
      <div className="grid grid-cols-7 gap-[2px] text-center text-[10px]">
        {['日','一','二','三','四','五','六'].map((w) => <div key={w} className="text-ios-text-secondary/60 py-1">{w}</div>)}
        {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const active = selectedDay === dateStr
          const has = hasEntry(d)
          return (
            <button key={d} onClick={() => setSelectedDay(active ? null : dateStr)}
              className={`py-1.5 rounded ${active ? 'bg-ios-blue text-white' : has ? 'bg-ios-blue/20 text-ios-blue' : 'text-ios-text'}`}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyMemory({ charName }: { charName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-[60px] h-[60px] rounded-full bg-card flex items-center justify-center text-[28px]">🌱</div>
      <p className="text-[14px] font-bold text-ios-text-secondary">还没有记忆</p>
      <p className="text-[12px] text-ios-text-secondary/60 text-center leading-relaxed px-6">
        开始和 {charName} 聊天后，<br />TA 对你的记忆会在这里慢慢积累。
      </p>
    </div>
  )
}

export default function MemoryApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)
  const { chars, conversations, apiSettings, updateConversation, updateCharMemory } = usePhoneStore()
  const [memTab, setMemTab] = useState<MemTab>('impression')
  const [selectedCharId, setSelectedCharId] = useState<string>(chars[0]?.id ?? '')

  // Local UI states
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [editingMonologue, setEditingMonologue] = useState(false)
  const [monologueDraft, setMonologueDraft] = useState('')
  const [aiLoading, setAiLoading] = useState<'tags' | 'monologue' | 'daily' | 'monthly' | 'refine' | null>(null)

  // Journal editing states
  const [editingSummary, setEditingSummary] = useState<string | null>(null) // monthId
  const [summaryDraft, setSummaryDraft] = useState('')
  const [editingEntry, setEditingEntry] = useState<{ mId: string; eId: string; value: string } | null>(null)
  const [addingJournal, setAddingJournal] = useState(false)
  const [newJournalContent, setNewJournalContent] = useState('')
  const [addingHand, setAddingHand] = useState(false)
  const [newHandContent, setNewHandContent] = useState('')
  const [handView, setHandView] = useState<'timeline' | 'calendar'>('timeline')
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const selectedChar = chars.find((c) => c.id === selectedCharId)
  const conv = conversations.find((c) => c.charIds.includes(selectedCharId))
  const charMemory = getCharMemory(conv, selectedCharId ?? '')
  const hasMessages = (conv?.messages.length ?? 0) > 0

  const relStage = charMemory?.affectionTemp ?? conv?.relationshipStage ?? 0
  const impressionTags = charMemory?.impressionTags ?? []
  const impressionMonologue = charMemory?.impressionMonologue ?? ''
  const journalMonths = conv?.journalMonths ?? []
  const handEntries = charMemory?.handEntries ?? []
  const dailyDiaries = charMemory?.dailyDiaries ?? []
  const monthlyDiaries = charMemory?.monthlyDiaries ?? []

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

  // Traces: last 30 messages, show real content，按实际发言者记录
  const traces = conv?.messages.slice().reverse().slice(0, 30).map((msg) => {
    const senderName = msg.role === 'user' ? '你' : (chars.find((c) => c.id === msg.charId)?.name ?? 'TA')
    return {
      time: msg.time,
      action: `${senderName}：「${msg.text.slice(0, 32)}${msg.text.length > 32 ? '…' : ''}」`,
      role: msg.role,
    }
  }) ?? []

  const totalMessages = conv?.messages.length ?? 0
  const lastRefined = charMemory?.lastRefinedMessageCount ?? 0
  const unrefinedCount = Math.max(0, totalMessages - lastRefined)
  const shouldAutoRefine = totalMessages > 50 && unrefinedCount >= 50

  // ── AI analysis helper ──
  async function callAI(systemPrompt: string, userContent: string): Promise<string> {
    const { baseUrl, apiKey, model } = apiSettings
    if (!baseUrl || !apiKey) throw new Error('未配置 API')
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        temperature: 0.7,
      }),
    })
    if (!res.ok) throw new Error('API 错误')
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  function getChatHistory(): string {
    return (conv?.messages ?? []).slice(-40).map((m) => {
      const who = m.role === 'user' ? '用户' : (chars.find((c) => c.id === m.charId)?.name ?? 'AI')
      return `${who}：${m.text}`
    }).join('\n')
  }
  function getRecentMessagesForRefine(n = 50): string {
    return (conv?.messages ?? []).slice(-n).map((m) => {
      const who = m.role === 'user' ? '用户' : (chars.find((c) => c.id === m.charId)?.name ?? 'AI')
      return `${who}：${m.text}`
    }).join('\n')
  }
  const hasAutoRefined = useRef<string>('')
  useEffect(() => {
    const key = `${conv?.id}-${selectedCharId}`
    if (shouldAutoRefine && conv && selectedCharId && aiLoading === null && hasAutoRefined.current !== key) {
      hasAutoRefined.current = key
      refineToHandlog()
    }
  }, [shouldAutoRefine, conv?.id, selectedCharId, aiLoading])

  async function refineToHandlog() {
    if (!conv || !selectedCharId) return
    setAiLoading('refine')
    try {
      const text = getRecentMessagesForRefine(50)
      const result = await callAI(
        `根据以下聊天记录，用客观陈述提炼 1 条约 100 字的手帐。格式：用户做了什么，XX（角色名）做了什么。只写事实（约定、事件、行为），不要口语、不要情绪词、不要温度。只输出手帐正文。`,
        text
      )
      const content = result.trim().slice(0, 100)
      if (content) {
        const entry: HandEntry = { id: `h-${Date.now()}`, date: today, content }
        updateCharMemory(conv.id, selectedCharId, {
          handEntries: [...handEntries, entry],
          lastRefinedMessageCount: totalMessages,
        })
      }
    } catch (e) { console.error(e) }
    setAiLoading(null)
  }

  async function analyzeImpression() {
    if (!conv) return
    setAiLoading('tags')
    try {
      const result = await callAI(
        `根据聊天记录，分析 ${selectedChar?.name ?? 'AI'} 对用户的印象标签。3-6 个词，逗号分隔，每词不超过 6 字。客观概括性格、习惯或互动特点（如：健谈、内向、爱熬夜、喜欢猫、常加班）。不要宠溺、夸张或恋爱向表达。只输出标签。`,
        getChatHistory()
      )
      const tags = result.split(/[，,、\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 6)
      if (selectedCharId) updateCharMemory(conv.id, selectedCharId, { impressionTags: tags })
    } catch (e) {
      console.error(e)
    }
    setAiLoading(null)
  }

  async function generateMonologue() {
    if (!conv) return
    setAiLoading('monologue')
    try {
      const result = await callAI(
        `你是 ${selectedChar?.name ?? 'AI'}。根据以下聊天记录，以第一人称写一段 80-120 字的内心独白，描述你对用户目前的感受与印象。语气自然，情感真实，不要编造没有的互动。只输出独白正文，不加引号或标题。`,
        getChatHistory()
      )
      if (selectedCharId) updateCharMemory(conv.id, selectedCharId, { impressionMonologue: result.trim() })
    } catch (e) {
      console.error(e)
    }
    setAiLoading(null)
  }

  // ── Tag management ──
  function addTag() {
    if (!conv || !selectedCharId || !newTag.trim()) return
    updateCharMemory(conv.id, selectedCharId, { impressionTags: [...impressionTags, newTag.trim()] })
    setNewTag(''); setAddingTag(false)
  }
  function removeTag(tag: string) {
    if (!conv || !selectedCharId) return
    updateCharMemory(conv.id, selectedCharId, { impressionTags: impressionTags.filter((t) => t !== tag) })
  }

  // ── Journal management ──
  function addJournalMonth() {
    if (!conv) return
    const now = new Date()
    const month = `${now.getFullYear()}年${now.getMonth() + 1}月`
    const newMonth: JournalMonth = { id: `m-${Date.now()}`, month, summary: newJournalContent.trim() || '手动创建的手帐。', entries: [] }
    updateConversation(conv.id, { journalMonths: [newMonth, ...journalMonths] })
    setNewJournalContent(''); setAddingJournal(false)
  }
  function deleteMonth(mId: string) {
    if (!conv) return
    updateConversation(conv.id, { journalMonths: journalMonths.filter((m) => m.id !== mId) })
  }
  function saveSummary(mId: string) {
    if (!conv) return
    updateConversation(conv.id, { journalMonths: journalMonths.map((m) => m.id !== mId ? m : { ...m, summary: summaryDraft }) })
    setEditingSummary(null)
  }
  function toggleEntry(mId: string, eId: string) {
    if (!conv) return
    updateConversation(conv.id, {
      journalMonths: journalMonths.map((m) => m.id !== mId ? m : {
        ...m, entries: m.entries.map((e) => e.id !== eId ? e : { ...e, open: !e.open })
      })
    })
  }
  function saveEntry(mId: string) {
    if (!conv || !editingEntry) return
    updateConversation(conv.id, {
      journalMonths: journalMonths.map((m) => m.id !== mId ? m : {
        ...m, entries: m.entries.map((e) => e.id !== editingEntry.eId ? e : { ...e, content: editingEntry.value })
      })
    })
    setEditingEntry(null)
  }
  function deleteEntry(mId: string, eId: string) {
    if (!conv) return
    updateConversation(conv.id, {
      journalMonths: journalMonths.map((m) => m.id !== mId ? m : { ...m, entries: m.entries.filter((e) => e.id !== eId) })
    })
  }
  function addHandEntry() {
    if (!conv || !selectedCharId || !newHandContent.trim()) return
    const entry: HandEntry = { id: `h-${Date.now()}`, date: today, content: newHandContent.trim().slice(0, 100) }
    updateCharMemory(conv.id, selectedCharId, { handEntries: [...handEntries, entry] })
    setNewHandContent(''); setAddingHand(false)
  }
  function deleteHandEntry(id: string) {
    if (!conv || !selectedCharId) return
    updateCharMemory(conv.id, selectedCharId, { handEntries: handEntries.filter((h) => h.id !== id) })
  }
  async function generateDailyDiary() {
    if (!conv) return
    setAiLoading('daily')
    try {
      const entries = handEntries.filter((h) => h.date === today).map((h) => h.content)
      const prompt = entries.length ? `今日手帐：${entries.join('；')}` : getChatHistory()
      const result = await callAI(
        `你是 ${selectedChar?.name ?? 'TA'}。根据以下内容，以第一人称写一段 60-100 字的今日日记。语气自然，像真人日记。只输出正文。`,
        prompt
      )
      const existing = dailyDiaries.filter((d) => d.date !== today)
      if (selectedCharId) updateCharMemory(conv.id, selectedCharId, { dailyDiaries: [...existing, { date: today, content: result.trim() }] })
    } catch (e) { console.error(e) }
    setAiLoading(null)
  }
  async function generateMonthlyDiary() {
    if (!conv) return
    setAiLoading('monthly')
    try {
      const thisMonth = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
      const dailies = dailyDiaries.filter((d) => d.date.startsWith(today.slice(0, 7)))
      const content = dailies.length ? dailies.map((d) => d.content).join('\n') : getChatHistory()
      const result = await callAI(
        `你是 ${selectedChar?.name ?? 'TA'}。根据以下本月日记/聊天，以第一人称写一段 80-120 字的月记总结。语气自然。只输出正文。`,
        content
      )
      const existing = monthlyDiaries.filter((m) => m.month !== thisMonth)
      if (selectedCharId) updateCharMemory(conv.id, selectedCharId, { monthlyDiaries: [...existing, { month: thisMonth, content: result.trim() }] })
    } catch (e) { console.error(e) }
    setAiLoading(null)
  }

  function addEntry(mId: string) {
    if (!conv) return
    const now = new Date()
    const newEntry: JournalEntry = {
      id: `e-${Date.now()}`, open: true,
      date: `${now.getMonth() + 1}月${now.getDate()}日`,
      mood: '晴', content: ''
    }
    updateConversation(conv.id, {
      journalMonths: journalMonths.map((m) => m.id !== mId ? m : { ...m, entries: [newEntry, ...m.entries] })
    })
    setEditingEntry({ mId, eId: newEntry.id, value: '' })
  }

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* Header */}
      <div className="flex items-center px-4 pt-[48px] pb-2 bg-header shrink-0">
        <button onClick={closeApp} className="text-ios-blue active:opacity-60">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-[16px] font-bold text-ios-text flex-1 text-center pr-[28px]">记忆</h1>
      </div>

      {/* Character selector */}
      {chars.length > 0 && (
        <div className="px-4 pt-[6px] pb-[8px] flex gap-4 overflow-x-auto scrollbar-none shrink-0">
          {chars.map((c) => {
            const active = selectedCharId === c.id
            return (
              <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                className="flex flex-col items-center gap-[5px] shrink-0 active:opacity-70 transition-opacity">
                <div className={`rounded-full transition-all ${active ? 'ring-[2.5px] ring-ios-blue ring-offset-[3px]' : ''}`} style={{ padding: active ? 0 : 0 }}>
                  <Avatar src={c.avatar} size={46} />
                </div>
                <span className={`text-[11px] font-bold truncate max-w-[52px] ${active ? 'text-ios-blue' : 'text-ios-text-secondary'}`}>{c.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex px-4 gap-[6px] pb-[10px] shrink-0">
        {([['impression', '印象'], ['journal', '手帐'], ['traces', '碎片']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMemTab(id)}
            className={`flex-1 py-[7px] rounded-[10px] text-[13px] font-bold transition-colors ${
              memTab === id ? 'bg-ios-blue text-white' : 'bg-card text-ios-text-secondary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-8">

        {/* ─── 印象 Tab ─── */}
        {memTab === 'impression' && (
          <div className="space-y-3">
            {!hasMessages ? (
              <EmptyMemory charName={selectedChar?.name ?? 'TA'} />
            ) : (
              <>
                {/* Impression tags */}
                <div className="bg-card rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-bold text-ios-text-secondary">🏷️ 印象标签</p>
                    <div className="flex gap-2">
                      <button onClick={() => setAddingTag(true)} className="text-[11px] text-ios-blue font-bold active:opacity-60">手动添加</button>
                      <button onClick={analyzeImpression} disabled={aiLoading !== null}
                        className="flex items-center gap-[3px] text-[11px] text-ios-blue font-bold active:opacity-60 disabled:opacity-40">
                        {aiLoading === 'tags' ? <Loader className="w-[11px] h-[11px] animate-spin" /> : <Sparkles className="w-[11px] h-[11px]" />}
                        AI 分析
                      </button>
                    </div>
                  </div>
                  {addingTag && (
                    <div className="flex gap-2 mb-3">
                      <input autoFocus value={newTag} onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        placeholder="新标签…"
                        className="flex-1 bg-ios-bg rounded-[8px] px-3 py-[6px] text-[13px] text-ios-text outline-none" />
                      <button onClick={addTag} className="bg-ios-blue text-white rounded-[8px] px-3 text-[12px] font-bold active:opacity-80">确定</button>
                    </div>
                  )}
                  {impressionTags.length === 0 ? (
                    <p className="text-[12px] text-ios-text-secondary/40 italic">AI 尚未生成标签，点击「AI 分析」生成</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {impressionTags.map((tag) => (
                        <button key={tag} onClick={() => removeTag(tag)}
                          className="px-3 py-[5px] bg-ios-blue/10 text-ios-blue text-[12px] font-bold rounded-full active:opacity-60 flex items-center gap-1">
                          {tag} <span className="text-[10px] opacity-50">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relationship stage (auto from store) */}
                <div className="bg-card rounded-[16px] p-4">
                  <p className="text-[12px] font-bold text-ios-text-secondary mb-1">🌡️ 情感温度</p>
                  <p className="text-[11px] text-ios-text-secondary/60 mb-3 leading-relaxed">
                    设定 TA 对你的态度。陌生人话少敷衍，熟悉会分享，暧昧有心动话，爱人也撒娇。
                  </p>
                  <div className="flex gap-[4px] mb-2">
                    {AFFECTION_STAGES.map((stage, i) => (
                      <button key={stage} onClick={() => conv && selectedCharId && updateCharMemory(conv.id, selectedCharId, { affectionTemp: i })}
                        className={`flex-1 py-[6px] rounded-[8px] text-[9.5px] font-bold text-center leading-tight transition-colors ${
                          relStage === i ? 'bg-ios-blue text-white'
                          : 'bg-ios-bg text-ios-text-secondary active:bg-ios-bg/80'
                        }`}>
                        {stage}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-ios-text-secondary text-center">
                    当前：<span className="font-bold text-ios-blue">{AFFECTION_STAGES[relStage]}</span>
                  </p>
                </div>

                {/* Inner monologue */}
                <div className="bg-card rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-bold text-ios-text-secondary">📖 {selectedChar?.name ?? 'TA'} 的内心独白</p>
                    <div className="flex gap-2">
                      {impressionMonologue && (
                        <button onClick={() => { setMonologueDraft(impressionMonologue); setEditingMonologue(true) }}
                          className="text-[11px] text-ios-blue font-bold active:opacity-60 flex items-center gap-[3px]">
                          <Pencil className="w-[11px] h-[11px]" /> 编辑
                        </button>
                      )}
                      <button onClick={generateMonologue} disabled={aiLoading !== null}
                        className="flex items-center gap-[3px] text-[11px] text-ios-blue font-bold active:opacity-60 disabled:opacity-40">
                        {aiLoading === 'monologue' ? <Loader className="w-[11px] h-[11px] animate-spin" /> : <Sparkles className="w-[11px] h-[11px]" />}
                        AI 生成
                      </button>
                    </div>
                  </div>
                  {editingMonologue ? (
                    <div className="space-y-2">
                      <textarea value={monologueDraft} onChange={(e) => setMonologueDraft(e.target.value)} rows={4}
                        className="w-full bg-ios-bg rounded-[10px] px-3 py-2 text-[13px] text-ios-text outline-none resize-none leading-relaxed" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingMonologue(false)} className="text-[12px] text-ios-text-secondary active:opacity-60">取消</button>
                        <button onClick={() => { if (conv && selectedCharId) updateCharMemory(conv.id, selectedCharId, { impressionMonologue: monologueDraft }); setEditingMonologue(false) }}
                          className="text-[12px] text-ios-blue font-bold active:opacity-60">保存</button>
                      </div>
                    </div>
                  ) : impressionMonologue ? (
                    <p className="text-[13px] text-ios-text leading-relaxed">{impressionMonologue}</p>
                  ) : (
                    <p className="text-[12px] text-ios-text-secondary/40 italic">尚未生成独白，点击「AI 生成」获取 {selectedChar?.name ?? 'TA'} 的第一人称视角。</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── 手帐 Tab ─── */}
        {memTab === 'journal' && (
          <div className="space-y-4">
            {!hasMessages && handEntries.length === 0 && dailyDiaries.length === 0 && monthlyDiaries.length === 0 ? (
              <EmptyMemory charName={selectedChar?.name ?? 'TA'} />
            ) : (
              <>
                {/* 手帐碎片 · 时间轴 / 日历 */}
                <div className="bg-card rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-bold text-ios-text-secondary">📒 手帐碎片</p>
                    <div className="flex gap-1">
                      <button onClick={() => setHandView('timeline')}
                        className={`px-2 py-1 rounded text-[11px] font-bold ${handView === 'timeline' ? 'bg-ios-blue text-white' : 'bg-ios-bg text-ios-text-secondary'}`}>时间线</button>
                      <button onClick={() => setHandView('calendar')}
                        className={`px-2 py-1 rounded text-[11px] font-bold ${handView === 'calendar' ? 'bg-ios-blue text-white' : 'bg-ios-bg text-ios-text-secondary'}`}>日历</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-ios-text-secondary/60 mb-3">每条约 100 字，记录当日点滴</p>
                  {addingHand ? (
                    <div className="space-y-2">
                      <textarea value={newHandContent} onChange={(e) => setNewHandContent(e.target.value)} rows={3}
                        autoFocus placeholder="写下这一刻…" maxLength={100}
                        className="w-full bg-ios-bg rounded-[10px] px-3 py-2 text-[13px] text-ios-text outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingHand(false); setNewHandContent('') }} className="text-[12px] text-ios-text-secondary">取消</button>
                        <button onClick={addHandEntry} disabled={!newHandContent.trim()} className="text-[12px] text-ios-blue font-bold">记录</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingHand(true)}
                      className="w-full py-2 rounded-[10px] border border-dashed border-ios-text-secondary/30 text-[12px] text-ios-text-secondary active:bg-ios-bg">
                      + 记一条
                    </button>
                  )}
                  {handView === 'calendar' && (
                    <CalendarView
                      calendarDate={calendarDate}
                      setCalendarDate={setCalendarDate}
                      selectedDay={selectedDay}
                      setSelectedDay={setSelectedDay}
                      handEntries={handEntries}
                    />
                  )}
                  {(handEntries.length > 0 || (handView === 'calendar' && selectedDay)) && (
                    <div className="mt-3 space-y-2">
                      {(handView === 'timeline'
                        ? [...handEntries].reverse().slice(0, 20)
                        : selectedDay ? handEntries.filter((h) => h.date === selectedDay) : []
                      ).map((h) => (
                        <div key={h.id} className="flex gap-2 items-start">
                          <span className="text-[10px] text-ios-text-secondary/60 shrink-0">{h.date.slice(5)}</span>
                          <p className="text-[12px] text-ios-text flex-1 leading-relaxed">{h.content}</p>
                          <button onClick={() => deleteHandEntry(h.id)} className="p-1 shrink-0"><Trash2 className="w-[12px] h-[12px] text-red-400" /></button>
                        </div>
                      ))}
                      {handView === 'calendar' && selectedDay && handEntries.filter((h) => h.date === selectedDay).length === 0 && (
                        <p className="text-[12px] text-ios-text-secondary/50 py-4 text-center">当天暂无记录</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 日日记 / 月日记 */}
                {(dailyDiaries.length > 0 || monthlyDiaries.length > 0 || hasMessages || handEntries.length > 0) && (
                  <div className="bg-card rounded-[16px] p-4 space-y-3">
                    <p className="text-[12px] font-bold text-ios-text-secondary">📖 日记</p>
                    {dailyDiaries.slice(-3).reverse().map((d) => (
                      <div key={d.date} className="border-b border-ios-bg pb-2 last:border-0">
                        <p className="text-[10px] text-ios-text-secondary mb-1">{d.date}</p>
                        <p className="text-[13px] text-ios-text leading-relaxed">{d.content}</p>
                      </div>
                    ))}
                    {monthlyDiaries.slice(-2).reverse().map((m) => (
                      <div key={m.month} className="border-b border-ios-bg pb-2 last:border-0">
                        <p className="text-[10px] text-ios-text-secondary mb-1">{m.month} 月记</p>
                        <p className="text-[13px] text-ios-text leading-relaxed">{m.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={generateDailyDiary} disabled={aiLoading !== null}
                        className="flex items-center gap-1 text-[11px] text-ios-blue font-bold">
                        {aiLoading === 'daily' ? <Loader className="w-[11px] h-[11px] animate-spin" /> : null}生成日日记
                      </button>
                      <button onClick={generateMonthlyDiary} disabled={aiLoading !== null}
                        className="flex items-center gap-1 text-[11px] text-ios-blue font-bold">
                        {aiLoading === 'monthly' ? <Loader className="w-[11px] h-[11px] animate-spin" /> : null}生成月记
                      </button>
                    </div>
                  </div>
                )}

                {/* Legacy: Add journal entry */}
                {addingJournal ? (
                  <div className="bg-card rounded-[14px] p-4 space-y-3">
                    <p className="text-[12px] font-bold text-ios-text-secondary">新建手帐</p>
                    <textarea value={newJournalContent} onChange={(e) => setNewJournalContent(e.target.value)} rows={4}
                      autoFocus placeholder="写下这段时间的记忆锚点…"
                      className="w-full bg-ios-bg rounded-[10px] px-3 py-2 text-[13px] text-ios-text outline-none resize-none leading-relaxed" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddingJournal(false)} className="text-[12px] text-ios-text-secondary active:opacity-60">取消</button>
                      <button onClick={addJournalMonth} className="text-[12px] text-ios-blue font-bold active:opacity-60">创建</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingJournal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-card rounded-[14px] text-[13px] font-bold text-ios-blue active:opacity-70">
                    <Plus className="w-4 h-4" /> 新建手帐
                  </button>
                )}

                {journalMonths.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <p className="text-[13px] font-bold text-ios-text-secondary">暂无手帐记录</p>
                    <p className="text-[12px] text-ios-text-secondary/60 text-center leading-relaxed">
                      AI 将在聊天积累后自动生成月度总结，<br />你也可以手动创建。
                    </p>
                  </div>
                ) : (
                  journalMonths.map((month) => (
                    <div key={month.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-[6px] h-[6px] rounded-full bg-ios-blue shrink-0" />
                        <p className="text-[14px] font-bold text-ios-text flex-1">{month.month}</p>
                        <button onClick={() => deleteMonth(month.id)} className="p-1 active:opacity-60">
                          <Trash2 className="w-[14px] h-[14px] text-red-400" />
                        </button>
                      </div>

                      {/* Monthly summary */}
                      <div className="bg-card rounded-[14px] p-4 mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-bold text-ios-text-secondary mb-1">⏳ 月度记忆锚点</p>
                          <button onClick={() => { setEditingSummary(month.id); setSummaryDraft(month.summary) }}
                            className="p-[2px] active:opacity-60 shrink-0">
                            <Pencil className="w-[13px] h-[13px] text-ios-blue" />
                          </button>
                        </div>
                        {editingSummary === month.id ? (
                          <div className="space-y-2">
                            <textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={3} autoFocus
                              className="w-full bg-ios-bg rounded-[8px] px-3 py-2 text-[13px] text-ios-text outline-none resize-none leading-relaxed" />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingSummary(null)} className="text-[12px] text-ios-text-secondary active:opacity-60">取消</button>
                              <button onClick={() => saveSummary(month.id)} className="text-[12px] text-ios-blue font-bold active:opacity-60">保存</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] text-ios-text leading-relaxed">{month.summary}</p>
                        )}
                      </div>

                      {/* Daily entries */}
                      <div className="bg-card rounded-[14px] overflow-hidden mb-1">
                        <button onClick={() => addEntry(month.id)}
                          className="w-full flex items-center gap-2 px-4 py-[10px] border-b border-ios-bg active:bg-ios-bg/40">
                          <Plus className="w-[14px] h-[14px] text-ios-blue" />
                          <span className="text-[12px] font-bold text-ios-blue">添加日记</span>
                        </button>
                        {month.entries.map((entry, ei) => (
                          <div key={entry.id} className={ei < month.entries.length - 1 ? 'border-b border-ios-bg' : ''}>
                            <div className="flex items-center">
                              <button onClick={() => toggleEntry(month.id, entry.id)}
                                className="flex-1 flex items-center gap-2 px-4 py-[10px] active:bg-ios-bg/40">
                                {entry.open ? <ChevronDown className="w-4 h-4 text-ios-blue shrink-0" /> : <ChevronRight className="w-4 h-4 text-ios-text-secondary/40 shrink-0" />}
                                <span className="text-[13px] font-bold text-ios-text">{entry.date}</span>
                                <span className="text-[11px] text-ios-text-secondary ml-1">({entry.mood})</span>
                              </button>
                              <div className="flex items-center gap-1 pr-3">
                                <button onClick={() => setEditingEntry({ mId: month.id, eId: entry.id, value: entry.content })} className="p-1 active:opacity-60">
                                  <Pencil className="w-[13px] h-[13px] text-ios-blue" />
                                </button>
                                <button onClick={() => deleteEntry(month.id, entry.id)} className="p-1 active:opacity-60">
                                  <Trash2 className="w-[13px] h-[13px] text-red-400" />
                                </button>
                              </div>
                            </div>
                            {entry.open && (
                              <div className="px-4 pb-3 pl-10">
                                {editingEntry?.mId === month.id && editingEntry.eId === entry.id ? (
                                  <div className="space-y-2">
                                    <textarea value={editingEntry.value} onChange={(e) => setEditingEntry({ ...editingEntry, value: e.target.value })} rows={3} autoFocus
                                      className="w-full bg-ios-bg rounded-[8px] px-3 py-2 text-[13px] text-ios-text outline-none resize-none leading-relaxed" />
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => setEditingEntry(null)} className="text-[12px] text-ios-text-secondary active:opacity-60">取消</button>
                                      <button onClick={() => saveEntry(month.id)} className="text-[12px] text-ios-blue font-bold active:opacity-60">保存</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[13px] text-ios-text leading-relaxed">{entry.content || <span className="text-ios-text-secondary/40 italic">空白日记</span>}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* ─── 碎片 Tab ─── */}
        {memTab === 'traces' && (
          <div className="space-y-3">
            {!hasMessages ? (
              <EmptyMemory charName={selectedChar?.name ?? 'TA'} />
            ) : (
              <>
                <div className="bg-card rounded-[14px] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-ios-text-secondary">📡 碎片时间线（最近 30 条）</p>
                    {unrefinedCount >= 50 && (
                      <p className="text-[10px] text-ios-blue">可提炼 {unrefinedCount} 条 → 手帐</p>
                    )}
                  </div>
                  <p className="text-[11px] text-ios-text-secondary/60 mt-1 leading-relaxed">
                    累计超过 50 条将自动 API 提炼进手帐，或点击下方按钮手动提炼。
                  </p>
                </div>
                <div className="bg-card rounded-[14px] overflow-hidden">
                  {traces.map((trace, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < traces.length - 1 ? 'border-b border-ios-bg' : ''}`}>
                      <div className={`w-[6px] h-[6px] rounded-full mt-[6px] shrink-0 ${trace.role === 'user' ? 'bg-[#25D366]' : 'bg-ios-blue'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ios-text leading-snug break-words">{trace.action}</p>
                        <p className="text-[10px] text-ios-text-secondary mt-[2px]">{trace.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {totalMessages >= 30 && (
                  <button onClick={refineToHandlog} disabled={aiLoading !== null}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-ios-blue/10 rounded-[14px] text-[13px] font-bold text-ios-blue active:opacity-70 disabled:opacity-50">
                    {aiLoading === 'refine' ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    提炼进手帐
                  </button>
                )}
                <div className="bg-card rounded-[14px] p-3 flex items-center gap-2">
                  <div className="w-[8px] h-[8px] rounded-full bg-green-400 animate-pulse shrink-0" />
                  <p className="text-[12px] text-ios-text-secondary">记忆实时记录中</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
