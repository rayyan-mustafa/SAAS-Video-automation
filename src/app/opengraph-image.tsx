import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tillercast: AI video automation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 55%, #be185d 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, opacity: 0.9 }}>Tillercast</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 24 }}>From idea to published video.</div>
        <div style={{ fontSize: 32, marginTop: 28, opacity: 0.85 }}>AI scripts, voiceovers, visuals and captions. Publish to your own channels.</div>
      </div>
    ),
    size
  );
}
