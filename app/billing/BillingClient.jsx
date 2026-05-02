"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Icon } from "@/components/Icon";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 12,
    interval: "month",
    features: [
      "Jusqu'à 100 commandes par mois",
      "1 boutique Shopify",
      "Support par email",
      "Mises à jour automatiques"
    ],
    popular: false,
    current: false
  },
  {
    id: "pro",
    name: "Pro",
    price: 24,
    interval: "month",
    features: [
      "Commandes illimitées",
      "Boutiques Shopify illimitées",
      "Support prioritaire",
      "API personnalisée",
      "Analyses avancées",
      "Intégrations premium"
    ],
    popular: true,
    current: false
  },
  {
    id: "summit",
    name: "Summit",
    price: 49,
    interval: "month",
    features: [
      "Tout du plan Pro",
      "Support dédié 24/7",
      "Formation personnalisée",
      "Migration de données",
      "SLA garanti",
      "Fonctionnalités sur mesure"
    ],
    popular: false,
    current: false
  }
];

export default function BillingClient({ user, subscription }) {
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const handleSubscribe = async (planId) => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planId,
          cycle: "monthly",
          userId: user.id,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Erreur lors de la création de la session:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Erreur lors de l'accès au portail:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler votre abonnement ? Vous garderez accès jusqu'à la fin de la période payée.")) {
      return;
    }

    setBillingLoading(true);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (response.ok) {
        alert("Votre abonnement a été annulé. Vous gardez accès jusqu'à la fin de la période payée.");
        window.location.reload();
      } else {
        throw new Error("Erreur lors de l'annulation");
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="billing-content">
      {/* État actuel de l'abonnement */}
      {subscription && (
        <div className="current-subscription">
          <div className="subscription-card">
            <div className="subscription-header">
              <h2>Abonnement actuel</h2>
              <span className={`status ${subscription.status}`}>
                {subscription.status === "active" ? "Actif" :
                 subscription.status === "canceled" ? "Annulé" :
                 subscription.status === "past_due" ? "En retard" : "Inactif"}
              </span>
            </div>

            <div className="subscription-details">
              <div className="plan-info">
                <h3>{subscription.planName}</h3>
                <p className="price">{formatPrice(subscription.price, subscription.interval)}</p>
              </div>

              {subscription.currentPeriodEnd && (
                <div className="renewal-info">
                  <p>
                    {subscription.cancelAtPeriodEnd ?
                      "Se termine le" :
                      "Renouvellement le"} {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>

            <div className="subscription-actions">
              <button
                type="button"
                className="primary"
                onClick={handleManageBilling}
                disabled={billingLoading}
              >
                {billingLoading ? "Chargement..." : "Gérer la facturation"}
              </button>

              {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => handleCancelSubscription()}
                >
                  Annuler l'abonnement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans disponibles */}
      <div className="plans-section">
        <h2>Choisissez votre plan</h2>
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`plan-card ${plan.popular ? "popular" : ""} ${plan.current ? "current" : ""}`}>
              {plan.popular && <div className="popular-badge">Le plus populaire</div>}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="amount">{formatPrice(plan.price, plan.interval)}</span>
                </div>
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <Icon name="check" size={16} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="plan-actions">
                {plan.current ? (
                  <button type="button" className="current-plan" disabled>
                    Plan actuel
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`subscribe ${plan.popular ? "popular" : ""}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading}
                  >
                    {loading ? "Chargement..." : plan.price === 0 ? "Commencer" : "S'abonner"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-section">
        <h2>Questions fréquentes</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Puis-je changer de plan à tout moment ?</h4>
            <p>Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les changements prennent effet immédiatement.</p>
          </div>

          <div className="faq-item">
            <h4>Comment annuler mon abonnement ?</h4>
            <p>Vous pouvez annuler votre abonnement à tout moment depuis le portail de facturation. Votre accès reste actif jusqu'à la fin de la période payée.</p>
          </div>

          <div className="faq-item">
            <h4>Les données sont-elles sécurisées ?</h4>
            <p>Oui, toutes les données sont chiffrées et stockées de manière sécurisée. Nous respectons les normes RGPD et ne partageons jamais vos données.</p>
          </div>

          <div className="faq-item">
            <h4>Proposez-vous un support technique ?</h4>
            <p>Oui, selon votre plan, vous bénéficiez de support par email, chat en direct, ou même un support dédié pour les entreprises.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .billing-content {
          display: grid;
          gap: 40px;
        }

        .current-subscription {
          margin-bottom: 20px;
        }

        .subscription-card {
          background: var(--surface-layer);
          border: 1px solid var(--line);
          border-radius: 17px;
          padding: 24px;
          backdrop-filter: blur(20px);
        }

        .subscription-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .subscription-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text-main);
        }

        .status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status.active {
          background: #10b981;
          color: white;
        }

        .status.canceled {
          background: #f59e0b;
          color: white;
        }

        .status.past_due {
          background: #ef4444;
          color: white;
        }

        .subscription-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .plan-info h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: var(--text-main);
        }

        .plan-info .price {
          font-size: 16px;
          color: var(--text-soft);
          margin: 0;
        }

        .renewal-info p {
          margin: 0;
          color: var(--text-soft);
          font-size: 14px;
        }

        .subscription-actions {
          display: flex;
          gap: 12px;
        }

        .plans-section h2 {
          text-align: center;
          font-size: 24px;
          color: var(--text-main);
          margin-bottom: 32px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .plan-card {
          background: var(--surface-layer);
          border: 1px solid var(--line);
          border-radius: 17px;
          padding: 24px;
          position: relative;
          backdrop-filter: blur(20px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .plan-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }

        .plan-card.popular {
          border-color: var(--accent);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }

        .plan-card.current {
          border-color: #10b981;
        }

        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .plan-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .plan-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: var(--text-main);
        }

        .plan-price .amount {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-main);
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: var(--text-soft);
          font-size: 14px;
        }

        .plan-features li:last-child {
          margin-bottom: 0;
        }

        .plan-actions {
          text-align: center;
        }

        .plan-actions button {
          width: 100%;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .subscribe {
          background: var(--accent);
          color: white;
          border: none;
        }

        .subscribe:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .subscribe.popular {
          background: linear-gradient(135deg, var(--accent), #7c3aed);
        }

        .current-plan {
          background: #10b981;
          color: white;
          border: none;
          cursor: default;
        }

        .faq-section h2 {
          text-align: center;
          font-size: 24px;
          color: var(--text-main);
          margin-bottom: 32px;
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .faq-item {
          background: var(--surface-layer);
          border: 1px solid var(--line);
          border-radius: 17px;
          padding: 20px;
          backdrop-filter: blur(20px);
        }

        .faq-item h4 {
          margin: 0 0 8px 0;
          color: var(--text-main);
          font-size: 16px;
        }

        .faq-item p {
          margin: 0;
          color: var(--text-soft);
          font-size: 14px;
          line-height: 1.5;
        }

        .primary {
          background: var(--accent);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .primary:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary {
          background: transparent;
          color: var(--text-main);
          border: 1px solid var(--line);
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary:hover:not(:disabled) {
          background: var(--surface-layer-hover);
        }

        .secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .billing-content {
            gap: 24px;
          }

          .subscription-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .subscription-actions {
            flex-direction: column;
          }

          .plans-grid {
            grid-template-columns: 1fr;
          }

          .faq-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}