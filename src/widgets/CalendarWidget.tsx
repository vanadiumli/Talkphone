const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarWidget() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const today = now.getDate()
  const monthName = now.toLocaleString('en-US', { month: 'long' })

  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="col-span-1 flex items-center justify-center">
      <div className="rounded-[22px] p-[12px] w-full"
        style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.28)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 24px rgba(0,0,0,0.08)',
        }}>
        <p className="text-[16px] font-bold text-white/90 leading-none mb-[6px] tracking-[-0.3px]">
          {monthName}
        </p>
        <div className="grid grid-cols-7 gap-y-[1px] text-center">
          {DAYS.map((d, i) => (
            <span key={`h-${i}`} className="text-[8px] font-bold text-white/40 leading-[16px]">{d}</span>
          ))}
          {cells.map((day, i) => {
            const isToday = day === today
            return (
              <span
                key={`d-${i}`}
                className={`w-[18px] h-[18px] flex items-center justify-center mx-auto rounded-full text-[9.5px]
                  ${!day ? '' : isToday ? 'bg-white/70 text-[#1a1a1a] font-bold' : 'text-white/80 font-medium'}`}
              >
                {day ?? ''}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
