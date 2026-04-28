'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Application Error</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>{error.message}</p>
            <button onClick={reset} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
