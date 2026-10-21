export default function Logo({ suffix, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-ink-900 ${className}`}>
      <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-mono text-sm shadow-sm">
        &lt;/&gt;
      </span>
      <span>一码平川{suffix}</span>
    </span>
  )
}
