import Widget from '../components/Widget'

export default function QuoteWidget() {
  return (
    <Widget size="large">
      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex-1 pt-[1px] pl-[2px]">
          <p className="text-[11px] text-ios-text-secondary tracking-[0.4px] mb-[8px]">
            Your day at a glance
          </p>
          <p className="text-[22px] font-serif leading-[1.08] text-ios-text tracking-[-0.3px]">
            The universe<br />does not owe you<br />anything.
          </p>
        </div>
        <div className="w-[76px] h-[118px] rounded-[12px] bg-[#ece7e1] flex items-end justify-center shrink-0 overflow-hidden">
          <svg width="48" height="96" viewBox="0 0 48 96" fill="#1f1f1f">
            <circle cx="24" cy="11" r="8" />
            <rect x="19" y="19" width="10" height="33" rx="4" />
            <rect x="7" y="31" width="11" height="6" rx="3" transform="rotate(-28 12.5 34)" />
            <rect x="29" y="26" width="12" height="6" rx="3" transform="rotate(56 35 29)" />
            <rect x="17" y="52" width="7" height="34" rx="3.5" transform="rotate(-7 20.5 69)" />
            <rect x="24" y="52" width="7" height="34" rx="3.5" transform="rotate(6 27.5 69)" />
          </svg>
        </div>
      </div>
    </Widget>
  )
}
