import { Check, Crown } from "lucide-react";
import { useApp } from "../context/AppContext";

export function PremiumPage() {
  const { t } = useApp();
  return (
    <section className="premium">
      <Crown size={34} />
      <p className="eyebrow">{t("premium.eyebrow")}</p>
      <h1>{t("premium.title")}</h1>
      <p>{t("premium.intro")}</p>
      <div className="feature-list">
        <span><Check /> {t("premium.featureSets")}</span>
        <span><Check /> {t("premium.featureInsights")}</span>
        <span><Check /> {t("premium.featureLanguages")}</span>
      </div>
      <button className="button button--muted" disabled>{t("premium.comingSoon")}</button>
    </section>
  );
}
