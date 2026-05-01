import DevOverlays from "./DevOverlays";
import "./globals.css";

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
    <html lang="fr" style={{ background: "#020107" }}>
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            height: 100%;
            background: #020107;
            color: #fff;
            font-family: Inter, system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          body {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><filter id="turbulence"><feTurbulence type="fractalNoise" baseFrequency="0.003" numOctaves="4" /></filter><radialGradient id="grad1" cx="30%" cy="40%"><stop offset="0%" style="stop-color:rgba(139,69,19,0.15);stop-opacity:1" /><stop offset="100%" style="stop-color:rgba(20,10,5,0);stop-opacity:1" /></radialGradient></defs><rect width="1200" height="800" fill="%23020107"/><ellipse cx="600" cy="300" rx="400" ry="300" fill="url(%23grad1)" filter="url(%23turbulence)" opacity="0.4"/></svg>') center/cover no-repeat fixed;
            background-color: #020107;
          }

          /* Glassmorphism variables */
          --glass-bg: rgba(18, 20, 28, 0.22);
          --glass-border: rgba(255, 255, 255, 0.14);
          --glass-blur: blur(30px) saturate(190%);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.75);
          --text-tertiary: rgba(255, 255, 255, 0.62);
          --accent-flare: rgba(255, 102, 64, 0.14);
          --accent-flare-border: rgba(255, 102, 64, 0.18);

          /* Global button styling */
          button, [role="button"] {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            border-radius: 16px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            backdrop-filter: var(--glass-blur);
            transition: all 0.22s ease;
          }

          button:hover, [role="button"]:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.22);
            transform: translateY(-1px);
          }

          /* Input and form elements */
          input, textarea, select {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            font-family: inherit;
            backdrop-filter: var(--glass-blur);
            transition: border-color 0.22s ease;
          }

          input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.22);
            background: rgba(18, 20, 28, 0.35);
          }

          input::placeholder {
            color: rgba(255, 255, 255, 0.45);
          }

          /* Cards and panels */
          .card, .panel, [role="region"] {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 24px;
            backdrop-filter: var(--glass-blur);
            box-shadow: 0 28px 90px rgba(0, 0, 0, 0.35);
            transition: all 0.22s ease;
          }

          .card:hover, .panel:hover {
            background: rgba(18, 20, 28, 0.35);
            border-color: rgba(255, 255, 255, 0.22);
            box-shadow: 0 35px 110px rgba(0, 0, 0, 0.4);
          }

          /* Scrollbars */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
          }
        `}</style>
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <DevOverlays />
      </body>
    </html>
  );
}
