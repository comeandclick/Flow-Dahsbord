import DevOverlays from "./DevOverlays";

export const metadata = {
  title: "Flow",
  description: "Flow workspace en ligne",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon-32.png",
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" style={{ background: "#000" }}>
      <body style={{ margin: 0 }}>
        {children}
        <DevOverlays />
      </body>
    </html>
  );
}
