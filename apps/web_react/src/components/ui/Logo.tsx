export default function Logo({ suffix, className = '' }: { suffix?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-ink-900 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm text-white shadow-sm">
        &lt;/&gt;
      </span>
      <span>一码平川{suffix}</span>
    </span>
  )
}
