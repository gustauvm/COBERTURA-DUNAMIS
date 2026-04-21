export function LoadingPanel({ label = 'Carregando dados operacionais...' }: { label?: string }) {
  return (
    <div className="loading-panel">
      <div className="loading-pulse" />
      <span>{label}</span>
    </div>
  )
}
