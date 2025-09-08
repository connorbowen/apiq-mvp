import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'APIQ - AI-Powered API Orchestrator'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 20px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            APIQ
          </h1>
          <p
            style={{
              fontSize: '32px',
              color: 'white',
              margin: '0 0 30px 0',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              maxWidth: '800px',
              lineHeight: '1.2',
            }}
          >
            Stop Writing API Code. Start Talking to APIs.
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: '8px',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              AI-Powered
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: '8px',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Zero-Code
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: '8px',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Multi-API
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
