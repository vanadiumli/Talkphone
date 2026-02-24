import { useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, FolderPlus, FilePlus, Pencil, Trash2 } from 'lucide-react'
import { usePhoneStore, type WorldBook } from '../store/phoneStore'

export default function WorldBookApp() {
  const closeApp = usePhoneStore((s) => s.closeApp)
  const {
    worldBookFolders,
    worldBooks,
    addWorldBookFolder,
    addWorldBook,
    updateWorldBook,
    removeWorldBook,
    removeWorldBookFolder,
  } = usePhoneStore()

  const [folderModal, setFolderModal] = useState(false)
  const [bookModal, setBookModal] = useState(false)
  const [editingBook, setEditingBook] = useState<WorldBook | null>(null)
  const [folderName, setFolderName] = useState('')
  const [bookName, setBookName] = useState('')
  const [bookContent, setBookContent] = useState('')
  const [bookFolderId, setBookFolderId] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())

  function toggleFolder(id: string) {
    setCollapsedFolders((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddFolder() {
    if (!folderName.trim()) return
    addWorldBookFolder({ name: folderName.trim() })
    setFolderName('')
    setFolderModal(false)
  }

  function handleAddBook() {
    if (!bookName.trim() || !bookContent.trim()) return
    addWorldBook({ name: bookName.trim(), content: bookContent.trim(), folderId: bookFolderId || null })
    setBookName('')
    setBookContent('')
    setBookFolderId(null)
    setBookModal(false)
  }

  function handleEditBook() {
    if (!editingBook || !bookName.trim() || !bookContent.trim()) return
    updateWorldBook(editingBook.id, { name: bookName.trim(), content: bookContent.trim(), folderId: bookFolderId || null })
    setEditingBook(null)
    setBookName('')
    setBookContent('')
    setBookFolderId(null)
  }

  function openEditModal(wb: WorldBook) {
    setEditingBook(wb)
    setBookName(wb.name)
    setBookContent(wb.content)
    setBookFolderId(wb.folderId)
  }

  function closeEditModal() {
    setEditingBook(null)
    setBookName('')
    setBookContent('')
    setBookFolderId(null)
  }

  const ungroupedBooks = worldBooks.filter((w) => !w.folderId)

  return (
    <div className="absolute inset-0 z-50 animate-slide-up">
      <div className="flex flex-col h-full bg-ios-bg">
        {/* Header */}
        <div className="flex items-center px-4 pt-[48px] pb-3 bg-header shrink-0">
          <button onClick={closeApp} className="text-ios-blue active:opacity-60 shrink-0">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-[16px] font-bold text-ios-text flex-1 text-center pr-[28px]">世界书</h1>
          <div className="flex gap-2 shrink-0 -mr-1">
            <button onClick={() => setFolderModal(true)} title="新建文件夹" className="p-1.5 rounded-full bg-ios-bg active:opacity-70">
              <FolderPlus className="w-5 h-5 text-ios-text-secondary" strokeWidth={1.8} />
            </button>
            <button onClick={() => { setEditingBook(null); setBookName(''); setBookContent(''); setBookFolderId(null); setBookModal(true) }} title="新建世界书" className="p-1.5 rounded-full bg-ios-bg active:opacity-70">
              <FilePlus className="w-5 h-5 text-ios-text-secondary" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-8 space-y-3">
          {worldBookFolders.map((folder) => {
            const books = worldBooks.filter((w) => w.folderId === folder.id)
            const collapsed = collapsedFolders.has(folder.id)
            return (
              <div key={folder.id} className="bg-card rounded-[16px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-ios-bg">
                  <button onClick={() => toggleFolder(folder.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70">
                    {collapsed ? <ChevronRight className="w-4 h-4 text-ios-text-secondary shrink-0" /> : <ChevronDown className="w-4 h-4 text-ios-text-secondary shrink-0" />}
                    <span className="text-[13px] font-bold text-ios-text truncate">{folder.name}</span>
                    <span className="text-[11px] text-ios-text-secondary shrink-0">({books.length})</span>
                  </button>
                  <button onClick={() => removeWorldBookFolder(folder.id)} className="p-1.5 text-red-500 active:opacity-70 shrink-0">
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </div>
                {!collapsed && (
                  <div className="divide-y divide-ios-bg/50">
                    {books.length === 0 ? (
                      <p className="px-4 py-4 text-[12px] text-ios-text-secondary/60 italic">暂无世界书</p>
                    ) : (
                      books.map((wb) => (
                        <WorldBookCard key={wb.id} wb={wb} onEdit={openEditModal} onDelete={removeWorldBook} />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {ungroupedBooks.length > 0 && (
            <div className="bg-card rounded-[16px] overflow-hidden">
              <div className="px-4 py-3 border-b border-ios-bg">
                <span className="text-[13px] font-bold text-ios-text-secondary">未分类</span>
              </div>
              <div className="divide-y divide-ios-bg/50">
                {ungroupedBooks.map((wb) => (
                  <WorldBookCard key={wb.id} wb={wb} onEdit={openEditModal} onDelete={removeWorldBook} />
                ))}
              </div>
            </div>
          )}

          {worldBookFolders.length === 0 && ungroupedBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-[60px] h-[60px] rounded-full bg-card flex items-center justify-center text-[28px]">📖</div>
              <p className="text-[14px] font-bold text-ios-text-secondary">还没有世界书</p>
              <p className="text-[12px] text-ios-text-secondary/60 text-center leading-relaxed px-6">
                世界书是 AI 回复时读取的世界设定。
                <br />
                点击右上角 + 新建文件夹或世界书。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New folder modal */}
      {folderModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setFolderModal(false)}>
          <div className="bg-card rounded-[20px] w-full max-w-[320px] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-bold text-ios-text mb-3">新建文件夹</p>
            <input value={folderName} onChange={(e) => setFolderName(e.target.value)}
              placeholder="文件夹名称" className="w-full bg-ios-bg rounded-[10px] px-4 py-3 text-[14px] text-ios-text outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setFolderModal(false)} className="flex-1 py-3 rounded-[12px] bg-ios-bg text-ios-text font-bold text-[14px] active:opacity-70">取消</button>
              <button onClick={handleAddFolder} className="flex-1 py-3 rounded-[12px] bg-ios-blue text-white font-bold text-[14px] active:opacity-80">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit world book modal */}
      {(bookModal || editingBook) && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => { setBookModal(false); closeEditModal() }}>
          <div className="bg-card rounded-t-[24px] w-full max-w-[390px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-ios-bg shrink-0">
              <p className="text-[16px] font-bold text-ios-text">{editingBook ? '编辑世界书' : '新建世界书'}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-ios-text-secondary block mb-1">名称</label>
                <input value={bookName} onChange={(e) => setBookName(e.target.value)}
                  placeholder="世界书昵称" className="w-full bg-ios-bg rounded-[10px] px-4 py-3 text-[14px] text-ios-text outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ios-text-secondary block mb-1">所属文件夹</label>
                <select value={bookFolderId ?? ''} onChange={(e) => setBookFolderId(e.target.value || null)}
                  className="w-full bg-ios-bg rounded-[10px] px-4 py-3 text-[14px] text-ios-text outline-none">
                  <option value="">未分类</option>
                  {worldBookFolders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-ios-text-secondary block mb-1">内容（世界设定）</label>
                <textarea value={bookContent} onChange={(e) => setBookContent(e.target.value)}
                  placeholder="世界书内容，AI 回复时会读取..."
                  rows={8} className="w-full bg-ios-bg rounded-[10px] px-4 py-3 text-[14px] text-ios-text outline-none resize-none" />
              </div>
            </div>
            <div className="p-4 pt-2 flex gap-3 border-t border-ios-bg shrink-0">
              <button onClick={() => { setBookModal(false); closeEditModal() }} className="flex-1 py-3 rounded-[12px] bg-ios-bg text-ios-text font-bold text-[14px] active:opacity-70">取消</button>
              <button onClick={editingBook ? handleEditBook : handleAddBook} disabled={!bookName.trim() || !bookContent.trim()}
                className="flex-1 py-3 rounded-[12px] bg-ios-blue text-white font-bold text-[14px] active:opacity-80 disabled:opacity-50">
                {editingBook ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WorldBookCard({ wb, onEdit, onDelete }: { wb: WorldBook; onEdit: (w: WorldBook) => void; onDelete: (id: string) => void }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3 group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-ios-text truncate">{wb.name}</p>
        <p className="text-[11px] text-ios-text-secondary/80 line-clamp-2 mt-0.5">{wb.content}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(wb)} className="p-1.5 rounded-full bg-ios-bg active:opacity-70">
          <Pencil className="w-3.5 h-3.5 text-ios-text-secondary" strokeWidth={1.8} />
        </button>
        <button onClick={() => onDelete(wb.id)} className="p-1.5 rounded-full bg-ios-bg text-red-500 active:opacity-70">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
