"use client";

const previewBlocks = [
  {
    id: 1,
    title: "Voice dialing",
    subtitle: "Connection stable",
    description: "Blurry, low resolution, distorted facial features, unnatural robotic movements, extra film | ts, beat, film | blooms",
    label: "VOICE DIALING...",
    status: "READY",
    variant: "bright",
    button: "Apply",
    accent: "flare",
  },
  {
    id: 2,
    title: "KSampler",
    subtitle: "Latent",
    description: "Sampler pipeline with deeper liquid glow and low opacity haze.",
    label: "AI flow",
    status: "Optimized",
    variant: "bright",
    button: "Optimize",
    accent: "flare",
  },
  {
    id: 3,
    title: "Video preview",
    subtitle: "Ready to push",
    description: "Smooth playback card with glass blur and a faint smoky highlight.",
    label: "Play now",
    status: "Live",
    variant: "bright",
    button: "Play",
    accent: "flare",
  },
  {
    id: 4,
    title: "Motion blur",
    subtitle: "Soft edges",
    description: "Higher transparency block with more liquid movement and softer reflections.",
    label: "Adjust",
    status: "Subtle",
    variant: "bright",
    button: "Update",
    accent: "flare",
  },
  {
    id: 5,
    title: "Control",
    subtitle: "Hover to feel",
    description: "A compact button block with denser glass and a deep copper shimmer.",
    label: "Touch",
    status: "Calm",
    variant: "bright",
    button: "Sync",
    accent: "flare",
  },
];

export default function PreviewPage() {
  const handleCardHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty("--pointer-x", `${x}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${y}px`);
  };

  const resetCardHover = (event) => {
    event.currentTarget.style.setProperty("--pointer-x", "50%");
    event.currentTarget.style.setProperty("--pointer-y", "50%");
  };

  return (
    <div className="preview-shell">
      <div className="preview-grid">
        {previewBlocks.map((block) => (
          <button
            key={block.id}
            type="button"
            className={`glass-card ${block.variant}`}
            onMouseMove={handleCardHover}
            onMouseLeave={resetCardHover}
            aria-label={block.title}
          >
            <div className="card-top">
              <div>
                <span className="card-title">{block.title}</span>
                <span className="card-subtitle">{block.subtitle}</span>
              </div>
              <span className={`status-pill ${block.accent}`}>{block.status}</span>
            </div>

            <p className="card-description">{block.description}</p>

            <div className="card-footer">
              <span className="card-label">{block.label}</span>
              <span className="card-action">{block.button}</span>
            </div>
          </button>
        ))}
      </div>

      <style jsx>{`
        .preview-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px;
          background: url('/theme-dark-wave.jpg') center/cover no-repeat;
          background-color: #020107;
          color: #fff;
          font-family: Inter, system-ui, sans-serif;
          overflow: hidden;
          position: relative;
        }

        .preview-grid {
          width: min(1240px, 100%);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .glass-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 260px;
          padding: 28px 26px;
          border-radius: 38px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(18, 20, 28, 0.22);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(30px) saturate(190%);
          color: #fff;
          text-align: left;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }

        .glass-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 35px 110px rgba(0, 0, 0, 0.4);
        }

        .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .glass-card::after {
          content: "";
          position: absolute;
          top: var(--pointer-y, 50%);
          left: var(--pointer-x, 50%);
          width: 120px;
          height: 120px;
          transform: translate(-50%, -50%) scale(0.65);
          background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 60%);
          opacity: 0;
          transition: opacity 0.25s ease, transform 0.25s ease;
          pointer-events: none;
        }

        .glass-card:hover::after {
          opacity: 0.16;
          transform: translate(-50%, -50%) scale(1);
        }

        .glass-card.soft {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.32);
        }

        .glass-card.haze {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.32);
        }

        .glass-card.softest {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.32);
        }

        .glass-card.bright {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.32);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }

        .card-title {
          display: block;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }

        .card-subtitle {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.68);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .status-pill {
          padding: 10px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .status-pill.glow {
          background: rgba(255, 102, 64, 0.14);
          border-color: rgba(255, 102, 64, 0.18);
        }

        .status-pill.amber {
          background: rgba(255, 102, 64, 0.14);
          border-color: rgba(255, 102, 64, 0.18);
        }

        .status-pill.smoke {
          background: rgba(255, 102, 64, 0.14);
          border-color: rgba(255, 102, 64, 0.18);
          color: #fff;
        }

        .status-pill.flare {
          background: rgba(255, 102, 64, 0.14);
          border-color: rgba(255, 102, 64, 0.18);
        }

        .card-description {
          margin: 0;
          line-height: 1.85;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          letter-spacing: 0.01em;
          z-index: 1;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          z-index: 1;
        }

        .card-label {
          color: rgba(255, 255, 255, 0.62);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .card-action {
          padding: 12px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          transition: transform 0.24s ease, background 0.24s ease;
        }

        .glass-card:hover .card-action {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.12);
        }

        @media (max-width: 920px) {
          .preview-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .preview-shell {
            padding: 20px;
          }

          .glass-card {
            padding: 22px;
            min-height: 240px;
          }

          .card-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .status-pill {
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
}
