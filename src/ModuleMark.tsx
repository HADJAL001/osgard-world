type Props = { index: number; className?: string }

export function ModuleMark({ index, className }: Props) {
  const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const marks = [
    <><path {...base} d="M12 2.5 19 5.7v5.2c0 4.3-2.7 7.8-7 10.6-4.3-2.8-7-6.3-7-10.6V5.7L12 2.5Z"/><path {...base} d="M14.5 9.3a3.2 3.2 0 1 0 .2 5.1"/><path {...base} d="M17.7 8.2h.01m1 2.1h.01m-1 2.1h.01"/></>,
    <><path {...base} d="M7 5.5h10M7 18.5h10"/><path {...base} d="M15.6 8.2c-.8-.9-2-1.4-3.6-1.2-1.6.2-2.7 1.1-2.7 2.4 0 3.1 5.8 1.2 5.8 4.2 0 1.3-1.2 2.3-3 2.4-1.5.1-2.8-.5-3.7-1.5"/></>,
    <><path {...base} d="M5.5 18V12h3v6m3-10v10h3V8m2.9-4v14h3V4"/><path {...base} d="m14.7 7.1 4.8-4.8m-4.1 0h4.1v4.1"/></>,
    <><path {...base} d="M7 3.5h10M7 20.5h10M8.7 3.5c0 3.8 1.2 5.8 3.3 8.5-2.1 2.7-3.3 4.7-3.3 8.5m6.6-17c0 3.8-1.2 5.8-3.3 8.5 2.1 2.7 3.3 4.7 3.3 8.5"/><path {...base} d="M9.7 8.2h4.6m-4.6 7.6h4.6"/></>,
    <><circle {...base} cx="12" cy="12" r="5.6"/><path {...base} d="M3.2 9.2c4.2-4.3 12.6-4.2 17.6.4M5.1 15.6c4.1 3.6 10.3 3.4 14-.2"/><path {...base} d="M4 12h16"/></>,
    <><path {...base} d="m12 2.8 7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1L12 2.8Z"/><path {...base} d="m4.6 7.1 7.4 4.3 7.4-4.3M12 11.4v9.8"/><circle cx="12" cy="11.4" r="1.1" fill="currentColor" stroke="none"/></>,
    <><path {...base} d="M5.2 8.2h8.1a3.8 3.8 0 0 1 0 7.6h-3.1"/><path {...base} d="m10.2 12-3 2.2 3 2.2"/><path {...base} d="M18.8 15.8h-8.1a3.8 3.8 0 0 1 0-7.6h3.1"/><path {...base} d="m13.8 12 3-2.2-3-2.2"/><circle cx="7.2" cy="14.2" r=".9" fill="currentColor" stroke="none"/><circle cx="16.8" cy="9.8" r=".9" fill="currentColor" stroke="none"/></>,
  ]
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{marks[index]}</svg>
}
