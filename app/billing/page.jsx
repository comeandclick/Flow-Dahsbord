"use client";

export default function BillingPage() {
  return (
    <div className="billing-page">
      <div className="page-container">
        <div className="page-header">
          <h1>Billing</h1>
          <p>Billing is coming soon. For now, return to the dashboard to continue using Flow.</p>
        </div>
      </div>

      <style jsx>{`
        .billing-page {
          min-height: 100vh;
          background: var(--background);
          padding: 20px;
        }

        .page-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        .page-header p {
          color: var(--text-soft);
          font-size: 16px;
        }

        @media (max-width: 768px) {
          .billing-page {
            padding: 16px;
          }

          .page-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
