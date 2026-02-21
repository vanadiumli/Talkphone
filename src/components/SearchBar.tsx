export default function SearchBar() {
  return (
    <div className="flex justify-center pb-[18px] pt-[0px]">
      <div className="flex items-center gap-[5px] bg-white/76 rounded-full px-[16px] py-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="6" cy="6" r="5" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" />
        </svg>
        <span className="text-[13px] text-ios-text-secondary tracking-[-0.1px]">Search</span>
      </div>
    </div>
  )
}
