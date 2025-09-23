import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              marginRight: '20px',
            }}
          >
            👕
          </div>
          <h1
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: 'white',
              margin: 0,
            }}
          >
            متجر التيشيرتات
          </h1>
        </div>
        <p
          style={{
            fontSize: '32px',
            color: 'white',
            textAlign: 'center',
            margin: 0,
            opacity: 0.9,
          }}
        >
          أفضل التيشيرتات بأسعار منافسة
        </p>
      </div>
    ),
    size
  );
}
