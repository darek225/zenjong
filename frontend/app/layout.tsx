import "../styles/globals.css";

export const metadata = {
  title: "Project Zenjong",
  description: "3D Multiplayer Mahjong Platform",
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
