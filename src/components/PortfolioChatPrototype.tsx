import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getPortfolioDemoReply } from '../portfolioDemo'

type DemoMessage = {
  id: number
  text: string
  tone: 'amber' | 'orange' | 'blue' | 'cyan'
  from: 'user' | 'companion'
}

const INITIAL_MESSAGES: DemoMessage[] = [
  { id: 1, text: '真正的陪伴，重要的是及时回应，还是持续记得？', tone: 'amber', from: 'companion' },
  { id: 2, text: '如果每次都像第一次见面，它更像工具。', tone: 'orange', from: 'user' },
  { id: 3, text: '关系需要时间留下痕迹，也需要允许遗忘。', tone: 'blue', from: 'companion' },
]

const TONES: DemoMessage['tone'][] = ['amber', 'orange', 'blue', 'cyan']

export default function PortfolioChatPrototype() {
  const [messages, setMessages] = useState<DemoMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [nextId, setNextId] = useState(4)

  const visibleMessages = useMemo(() => [...messages].reverse().slice(0, 5), [messages])

  function sendMessage(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    const userId = nextId
    setMessages((items) => [...items, {
      id: userId,
      text,
      tone: TONES[userId % TONES.length],
      from: 'user',
    }])
    setInput('')
    setNextId(userId + 1)

    window.setTimeout(() => {
      const reply = getPortfolioDemoReply(text).split('|||').join('，')
      setMessages((items) => [...items, {
        id: userId + 1,
        text: reply,
        tone: TONES[(userId + 1) % TONES.length],
        from: 'companion',
      }])
      setNextId(userId + 2)
    }, 720)
  }

  return (
    <div className="portfolio-chat-demo">
      <div className="portfolio-chat-header">
        <span className="portfolio-chat-avatar">L</span>
        <span><strong>Lin Zhiyu</strong><small>online</small></span>
      </div>

      <div className="portfolio-bubble-stage" aria-live="polite">
        {visibleMessages.map((message) => (
          <div
            className={`portfolio-drop-bubble is-${message.tone} is-${message.from}`}
            key={message.id}
          >
            <span className="portfolio-bubble-text">{message.text}</span>
            <span className="portfolio-bubble-face" aria-hidden="true">
              <i /><i /><b />
            </span>
          </div>
        ))}
      </div>

      <form className="portfolio-chat-input" onSubmit={sendMessage}>
        <input
          aria-label="输入消息"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="发消息…"
        />
        <button type="submit" aria-label="发送消息">↑</button>
      </form>
    </div>
  )
}
