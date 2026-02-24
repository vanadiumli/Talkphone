import { useState, useRef } from 'react'
import { ChevronLeft, Plus, ImagePlus, MessageSquare } from 'lucide-react'
import { usePhoneStore, type ForumPost } from '../store/phoneStore'

type ForumTab = 'home' | 'search' | 'messages' | 'me'
type ForumSection = 'following' | 'recommended' | 'gossip'

export default function ForumApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)
  const { forumPosts, userMasks, addForumPost } = usePhoneStore()
  const [mainTab, setMainTab] = useState<ForumTab>('home')
  const [section, setSection] = useState<ForumSection>('recommended')
  const [showPostModal, setShowPostModal] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postImage, setPostImage] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const authorName = userMasks[0]?.name ?? '我'
  const filteredPosts = forumPosts.filter((p) => p.section === section)

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
    if (!postContent.trim()) return
    addForumPost({
      content: postContent.trim(),
      authorName,
      imageUrl: postImage ?? undefined,
      timestamp: new Date().toISOString(),
      section,
    })
    setPostContent('')
    setPostImage(null)
    setShowPostModal(false)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = () => setPostImage(r.result as string)
    r.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="absolute inset-0 z-50 animate-slide-up">
      <div className="flex flex-col h-full bg-ios-bg">
        {/* Header */}
        <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0 border-b border-ios-bg/50">
          <button onClick={closeApp} className="text-ios-blue active:opacity-60 shrink-0">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-[16px] font-bold text-ios-text flex-1 text-center pr-[28px]">论坛</h1>
        </div>

        {/* Sub tabs (when home) */}
        {mainTab === 'home' && (
          <div className="flex shrink-0 border-b border-ios-bg/50">
            {(['following', 'recommended', 'gossip'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex-1 py-3 text-[14px] font-bold transition-colors ${
                  section === s ? 'text-ios-blue border-b-2 border-ios-blue' : 'text-ios-text-secondary'
                }`}
              >
                {s === 'following' ? '关注' : s === 'recommended' ? '推荐' : '八卦'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {mainTab === 'home' && (
            <div className="px-4 py-3 space-y-3">
              {filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <MessageSquare className="w-12 h-12 text-ios-text-secondary/40" strokeWidth={1.5} />
                  <p className="text-[14px] font-bold text-ios-text-secondary">还没有帖子</p>
                  <p className="text-[12px] text-ios-text-secondary/60">点击右下角 + 发布第一条</p>
                </div>
              ) : (
                filteredPosts.map((p) => (
                  <ForumPostCard key={p.id} post={p} formatTime={formatTime} />
                ))
              )}
            </div>
          )}
          {mainTab === 'search' && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-[14px] text-ios-text-secondary">搜索功能即将上线</p>
            </div>
          )}
          {mainTab === 'messages' && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-[14px] text-ios-text-secondary">私信功能即将上线</p>
            </div>
          )}
          {mainTab === 'me' && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-[14px] text-ios-text-secondary">我的功能即将上线</p>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex shrink-0 border-t border-ios-bg/50 py-2">
          {[
            { id: 'home' as const, label: '首页' },
            { id: 'search' as const, label: '搜索' },
            { id: 'messages' as const, label: '私信' },
            { id: 'me' as const, label: '我' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id)}
              className={`flex-1 py-2 text-[12px] font-bold transition-colors ${
                mainTab === t.id ? 'text-ios-blue' : 'text-ios-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowPostModal(true)}
          className="absolute bottom-16 right-4 w-12 h-12 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Post modal */}
      {showPostModal && (
        <div className="absolute inset-0 z-[60] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPostModal(false)}>
          <div className="bg-card rounded-t-[24px] flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-ios-bg shrink-0">
              <p className="text-[16px] font-bold text-ios-text">发布新帖</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="有什么新鲜事？"
                rows={4}
                className="w-full bg-ios-bg rounded-[12px] px-4 py-3 text-[14px] text-ios-text outline-none resize-none placeholder:text-ios-text-secondary/50"
              />
              {postImage && (
                <div className="relative inline-block">
                  <img src={postImage} alt="" className="w-[100px] h-[100px] object-cover rounded-[10px]" />
                  <button onClick={() => setPostImage(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[14px]">×</button>
                </div>
              )}
              <label htmlFor="forum-image-upload" className="flex items-center gap-2 text-[13px] text-ios-text-secondary active:opacity-70 cursor-pointer">
                <ImagePlus className="w-5 h-5" strokeWidth={1.8} />
                <span>添加图片</span>
                <input id="forum-image-upload" ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            </div>
            <div className="p-4 pt-2 flex gap-3 border-t border-ios-bg shrink-0">
              <button onClick={() => setShowPostModal(false)} className="flex-1 py-3 rounded-[12px] bg-ios-bg text-ios-text font-bold text-[14px] active:opacity-70">取消</button>
              <button onClick={handlePublish} disabled={!postContent.trim()} className="flex-1 py-3 rounded-[12px] bg-ios-blue text-white font-bold text-[14px] active:opacity-80 disabled:opacity-50">发布</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ForumPostCard({ post, formatTime }: { post: ForumPost; formatTime: (ts: string) => string }) {
  return (
    <div className="bg-card rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-bold text-ios-text">{post.authorName}</p>
        <p className="text-[11px] text-ios-text-secondary">{formatTime(post.timestamp)}</p>
      </div>
      <p className="text-[13px] text-ios-text leading-relaxed">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-2 w-full max-w-[200px] rounded-[10px] object-cover" />}
    </div>
  )
}
