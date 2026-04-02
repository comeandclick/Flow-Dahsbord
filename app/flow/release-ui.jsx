const RELEASE_STATUS_META = {
  done: { label: "Termine", color: "var(--green)", tint: "var(--green-d)", border: "rgba(74,158,110,.24)" },
  wip: { label: "En cours", color: "var(--orange)", tint: "rgba(200,122,74,.14)", border: "rgba(200,122,74,.24)" },
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
    <div className="release-widget-backdrop" onClick={onClose}>
      <div className="release-widget" role="dialog" aria-modal="true" aria-label="Journal des mises a jour" onClick={(event) => event.stopPropagation()}>
        <div className="release-widget-head">
          <div>
            <div className="release-widget-kicker">Journal de version</div>
            <h3>{label}</h3>
            <p>{release?.summary || "Chaque passe doit garder ce journal a jour pour qu'une autre IA puisse reprendre sans repartir de zero."}</p>
          </div>
          <button type="button" className="release-close" onClick={onClose} aria-label="Fermer le journal des mises a jour">Fermer</button>
        </div>

        <div className="release-stats">
          {[
            { key: "done", value: counts.done || 0 },
            { key: "wip", value: counts.wip || 0 },
            { key: "todo", value: counts.todo || 0 },
          ].map((item) => {
            const meta = getReleaseStatusMeta(item.key);
            return (
              <div key={item.key} className="release-stat" style={{ borderColor: meta.border, background: meta.tint }}>
                <span className="release-dot" style={{ background: meta.color }} />
                <strong>{item.value}</strong>
                <span>{meta.label}</span>
              </div>
            );
          })}
        </div>

        <div className="release-list">
          {changes.map((change) => {
            const meta = getReleaseStatusMeta(change.status);
            return (
              <div key={change.id} className="release-entry" style={{ borderColor: meta.border, background: meta.tint }}>
                <div className="release-entry-head">
                  <div>
                    <strong>{change.title}</strong>
                    {change.subtitle ? <span>{change.subtitle}</span> : null}
                  </div>
                  <span className="release-status" style={{ color: meta.color, borderColor: meta.border, background: "rgba(0,0,0,.08)" }}>
                    <span className="release-dot" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

