import "../styles/globals.css";
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Zenjong',
  description: '3D Arcade Mahjong Solitaire',
  openGraph: {
    title: 'Zenjong - 3D Arcade Mahjong Solitaire',
    description: '3D Multiplayer Mahjong Platform with InstancedMesh rendering and touch gestures.',
    images: ['https://zenjong.example.com/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    site: 'zenjong',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
