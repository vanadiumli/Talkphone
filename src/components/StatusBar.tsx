import { useEffect } from 'react'
import { usePhoneStore, getCurrentTime } from '../store/phoneStore'

function CellularSignal() {
  return (
    <svg width="18" height="12" viewBox="0 0 17 11" fill="currentColor">
      <rect x="0" y="8" width="3" height="3" rx="0.7" />
      <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.7" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
    </svg>
  )
}

function BatteryIcon({ level }: { level: number }) {
  const fillW = Math.max(0, Math.min(1, level / 100)) * 18
  return (
    <div className="relative flex items-center">
      <svg width="29" height="14" viewBox="0 0 27 13" className="block">
        <rect x="0.5" y="0.5" width="22" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <path d="M23.5 4C23.5 4 25 4 25 5.5L25 7.5C25 9 23.5 9 23.5 9" fill="currentColor" opacity="0.4" />
        <rect x="1.5" y="1.5" width={fillW} height="10" rx="1.5" fill="currentColor" />
      </svg>
      <span className="absolute left-0 w-[23px] text-center text-[9.5px] font-bold leading-[14px] text-white mix-blend-difference">
        {level}
      </span>
    </div>
  )
}

export default function StatusBar() {
  const { time, batteryLevel, setTime } = usePhoneStore()

  useEffect(() => {
    const timer = setInterval(() => setTime(getCurrentTime()), 10_000)
    return () => clearInterval(timer)
  }, [setTime])

  return (
    <div className="flex items-center justify-between px-[24px] pt-[14px] pb-[8px] text-ios-text">
      <div className="flex items-center gap-[5px]">
        <span className="text-[15px] font-bold tracking-[-0.3px] leading-none">{time}</span>
        <svg width="12" height="11" viewBox="0 0 13 12" fill="currentColor">
          <path d="M6.5 11.5C6.3 11.5 6.1 11.4 5.95 11.2L3.7 8.8C2.6 7.6 1.8 6.65 1.3 5.85C0.8 5.05 0.55 4.25 0.55 3.45C0.55 2.35 0.9 1.5 1.6 0.85C2.3 0.2 3.2 -0.1 4.25 0.05C4.8 0.1 5.3 0.3 5.7 0.6C6.1 0.9 6.35 1.25 6.5 1.65C6.65 1.25 6.9 0.9 7.3 0.6C7.7 0.3 8.2 0.1 8.75 0.05C9.8 -0.1 10.7 0.2 11.4 0.85C12.1 1.5 12.45 2.35 12.45 3.45C12.45 4.25 12.2 5.05 11.7 5.85C11.2 6.65 10.4 7.6 9.3 8.8L7.05 11.2C6.9 11.4 6.7 11.5 6.5 11.5Z" />
        </svg>
      </div>
      <div className="flex items-center gap-[6px]">
        <CellularSignal />
        <span className="text-[14px] font-bold leading-none">LTE</span>
        <BatteryIcon level={batteryLevel} />
      </div>
    </div>
  )
}
