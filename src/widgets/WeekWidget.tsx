import Widget from '../components/Widget'

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000)
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

function CloudIcon() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" fill="#B0B0B5">
      <path d="M24.5 22H7.5C5.5 22 3.8 21.3 2.5 19.9C1.2 18.5 0.5 16.9 0.5 15C0.5 13.3 1 11.8 2 10.5C3 9.2 4.3 8.3 5.9 7.9C6.5 5.5 7.8 3.5 9.7 2.1C11.6 0.7 13.7 0 16 0C18.8 0 21.2 1 23.1 2.9C25 4.8 26 7.1 26 9.8C27.2 10 28.2 10.6 29 11.5C29.7 12.5 30 13.5 30 14.7C30 16 29.5 17.2 28.6 18.1C27.7 19 26.5 19.5 25.2 19.5" />
    </svg>
  )
}

export default function WeekWidget() {
  const now = new Date()
  const year = now.getFullYear()
  const week = getWeekNumber(now)

  return (
    <Widget size="medium">
      <div className="flex flex-col justify-between h-full">
        <CloudIcon />
        <div className="mt-auto pl-[2px] pb-[1px]">
          <p className="text-[24px] font-semibold text-ios-text leading-[1.1] tracking-[-0.3px]">
            {year} Week {week}
          </p>
        </div>
      </div>
    </Widget>
  )
}
