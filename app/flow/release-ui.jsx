const RELEASE_STATUS_META = {
  done: { label: "Termine", color: "var(--orange)", tint: "rgba(255,255,255,.14)", border: "rgba(255,255,255,.24)" },
  wip: { label: "En cours", color: "var(--orange)", tint: "rgba(255,255,255,.14)", border: "rgba(255,255,255,.24)" },
  todo: { label: "A faire", color: "var(--red)", tint: "var(--red-d)", border: "rgba(216,92,92,.24)" },
};

function getReleaseStatusMeta(status) {
  return RELEASE_STATUS_META[status] || RELEASE_STATUS_META.todo;
}

export function ReleaseBadge({ className, label, onClick, ...props }) {
  return (
    <button
      type="button"
      className={`${className} release-click`}
      onClick={onClick}
      title="Ouvrir le journal des mises a jour"
      aria-label={`Ouvrir le journal des mises a jour ${label}`}
      {...props}
    >
      {label}
    </button>
  );
}

export function ReleaseWidget({ release, label, onClose }) {
  const changes = Array.isArray(release?.changes) ? release.changes : [];
  const counts = changes.reduce((acc, change) => {
    acc[change.status] = (acc[change.status] || 0) + 1;
    return acc;
  }, { done: 0, wip: 0, todo: 0 });

  return (
    <>
      <div className="command-backdrop" onClick={onClose}>
        <div
          className="command-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Journal des mises a jour"
          onClick={(event) => event.stopPropagation()}
          style={{
            backgroundColor: 'rgba(8, 12, 18, 0.96)',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
          }}
      >
        <div
          className="release-widget-head"
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              className="release-widget-kicker"
              style={{
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Journal de version
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>{label}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {release?.summary || "Chaque passe doit garder ce journal a jour pour qu'une autre IA puisse reprendre sans repartir de zero."}
            </p>
          </div>
          <button
            type="button"
            className="release-close"
            onClick={onClose}
            aria-label="Fermer le journal des mises a jour"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              marginLeft: '16px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="release-stats"
          style={{
            padding: '20px 24px',
            display: 'flex',
            gap: '12px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {[
            { key: "done", value: counts.done || 0 },
            { key: "wip", value: counts.wip || 0 },
            { key: "todo", value: counts.todo || 0 },
          ].map((item) => {
            const meta = getReleaseStatusMeta(item.key);
            return (
              <div
                key={item.key}
                className="release-stat"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${meta.border}`,
                  backgroundColor: meta.tint,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  className="release-dot"
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: meta.color,
                  }}
                />
                <strong style={{ fontSize: '18px', fontWeight: '600' }}>{item.value}</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{meta.label}</span>
              </div>
            );
          })}
        </div>

        <div
          className="release-list"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {changes.map((change) => {
            const meta = getReleaseStatusMeta(change.status);
            return (
              <div
                key={change.id}
                className="release-entry"
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${meta.border}`,
                  backgroundColor: meta.tint,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>{change.title}</strong>
                  {change.subtitle ? <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{change.subtitle}</span> : null}
                </div>
                <span
                  className="release-status"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: meta.color,
                    border: `1px solid ${meta.border}`,
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    whiteSpace: 'nowrap',
                    marginLeft: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    className="release-dot"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: meta.color,
                    }}
                  />
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <style jsx>{`
      .command-backdrop {
        position: fixed;
        inset: 0;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(4, 6, 10, 0.92);
        backdrop-filter: blur(18px);
        display: grid;
        place-items: center;
        z-index: 99999;
        padding: 24px;
        overflow: auto;
        pointer-events: auto;
      }
      .command-modal {
        position: relative;
        z-index: 100000;
        width: min(760px, 100%);
        max-height: min(84vh, 860px);
        border-radius: 30px;
        padding: 16px;
        animation: riseIn 0.26s ease;
        overflow: hidden;
        box-shadow: 0 40px 120px rgba(0, 0, 0, 0.28);
      }
    `}</style>
    </>
  );
}

