import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom, #dbf4ff, #fff1f1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          متجر التيشيرتات
        </h1>
        <p
          style={{
            fontSize: '32px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          متجر إلكتروني لبيع التيشيرتات عالية الجودة
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
