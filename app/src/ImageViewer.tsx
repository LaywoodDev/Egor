import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  imageUrls: string[]
  initialIndex: number
  onClose: () => void
}

function ImageViewer({ imageUrls, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setIndex(prev => prev === 0 ? imageUrls.length - 1 : prev - 1)
      else if (e.key === 'ArrowRight') setIndex(prev => prev === imageUrls.length - 1 ? 0 : prev + 1)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [imageUrls.length, onClose])

  const prev = () => setIndex(i => i === 0 ? imageUrls.length - 1 : i - 1)
  const next = () => setIndex(i => i === imageUrls.length - 1 ? 0 : i + 1)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 2001,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            padding: 8,
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <X size={24} strokeWidth={2}/>
        </button>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={imageUrls[index]}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />

        {imageUrls.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute',
                left: 16,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <ChevronLeft size={28} strokeWidth={2}/>
            </button>

            <button
              onClick={next}
              style={{
                position: 'absolute',
                right: 16,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <ChevronRight size={28} strokeWidth={2}/>
            </button>

            <div style={{
              position: 'absolute',
              bottom: 16,
              color: 'rgba(255,255,255,0.8)',
              fontSize: 14,
              background: 'rgba(0,0,0,0.5)',
              padding: '8px 16px',
              borderRadius: 8,
            }}>
              {index + 1} / {imageUrls.length}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageViewer
