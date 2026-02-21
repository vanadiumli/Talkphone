import { useRef } from 'react'
import { usePhoneStore } from '../store/phoneStore'

export default function PolaroidWidget() {
  const photo = usePhoneStore((s) => s.polaroidPhoto)
  const setPhoto = usePhoneStore((s) => s.setPolaroidPhoto)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="col-span-1 flex items-center justify-center">
      <div
        className="cursor-pointer rotate-[-3deg] hover:rotate-[-1deg] transition-transform duration-300"
        onClick={() => inputRef.current?.click()}
        style={{
          width: 138,
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.10))',
        }}
      >
        <div className="bg-white rounded-[4px] p-[8px] pb-[28px]">
          <div className="aspect-[3/4] bg-[#e6e6e6] rounded-[2px] overflow-hidden">
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}
