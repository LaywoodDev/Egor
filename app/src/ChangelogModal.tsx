import { X } from 'lucide-react'

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '28 марта 2026',
    changes: [
      'Запуск платформы',
    ],
  },
]

interface Props {
  onClose: () => void
}

function ChangelogModal({ onClose }: Props) {
  return (
    <div
      className="modal-fade"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="modal-pop"
        style={{ background: 'var(--bg-card)', borderRadius: 20, width: '90%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Обновления</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(var(--t),0.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ maxHeight: 600, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {CHANGELOG.map(entry => (
            <div key={entry.version} style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>V{entry.version}</span>
                <span style={{ fontSize: 12, color: 'rgba(var(--t),0.35)' }}>{entry.date}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.changes.map((change, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(var(--t),0.25)', flexShrink: 0, marginTop: 7 }}/>
                    <span style={{ fontSize: 14, color: 'rgba(var(--t),0.75)', lineHeight: 1.5 }}>{change}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChangelogModal
