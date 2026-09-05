import "../styles/globals.css";

export const metadata = {
  title: "Project Zenjong",
  description: "3D Multiplayer Mahjong Platform",
  author: "Zenjong Team",
  image: "https://zenjong.example.com/logo.png",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Project Zenjong - Multiplayer Mahjong" />
        <meta property="og:description" content="3D Multiplayer Mahjong Platform with InstancedMesh rendering and touch gestures." />
        <meta property="og:image" content="https://zenjong.example.com/logo.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:site" content="https://zenjong.example.com" />
        <meta property="facebook:tag" content="zenjong-mahjong" />
        <link rel="canonical" href="https://zenjong.example.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
