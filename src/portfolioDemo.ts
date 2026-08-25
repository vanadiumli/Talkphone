export const PORTFOLIO_DEMO_CONVERSATION_ID = 'conv-portfolio-demo'

export function isPortfolioDemo(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('demo') === 'portfolio'
}

export function getPortfolioDemoReply(input: string): string {
  const text = input.trim()

  if (/AI|人工智能|模型|智能体|agent/i.test(text)) {
    return '我不觉得 AI 陪伴只是把回答说得像人|||更重要的是记得关系如何发生|||也知道什么时候不该打扰'
  }
  if (/记忆|遗忘|记住|长期/.test(text)) {
    return '记住并不是越多越好|||有些细节应该沉淀成理解|||有些则应该允许被忘掉'
  }
  if (/陪伴|关系|情感|朋友/.test(text)) {
    return '如果每次对话都像第一次见面|||那它更像一个工具|||关系需要时间留下痕迹'
  }
  if (/隐私|伦理|安全|边界|删除/.test(text)) {
    return '越像人的系统越需要清晰边界|||它应该解释自己记住了什么|||也让人随时修改或删除'
  }
  if (/你好|嗨|在吗|hello/i.test(text)) {
    return '在啊|||刚好还在想我们上次聊的问题'
  }

  return '这件事挺值得想的|||你更在意它看起来像人|||还是它真的逐渐理解你？'
}
