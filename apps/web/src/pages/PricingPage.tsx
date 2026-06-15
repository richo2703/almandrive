import { useEffect, useMemo, useState } from "react";
import { api, type AccessStatus, type Banner, type NewsItem, type Product, type Promotion } from "../lib/api";
import { useApp } from "../context/AppContext";

function openInvoice(invoiceLink: string) {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.openInvoice) {
    webApp.openInvoice(invoiceLink);
    return;
  }
  window.location.href = invoiceLink;
}

function PlacementSection({
  title,
  items,
}: {
  title: string;
  items: Array<Banner | Promotion | NewsItem>;
}) {
  if (!items.length) return null;
  return (
    <section className="menu-list" aria-label={title}>
      {items.map((item) => (
        <div className="question-row" key={item.id}>
          <div>
            <span className="tag">{title}</span>
            <strong>{item.title}</strong>
            {"excerpt" in item && item.excerpt ? <small>{item.excerpt}</small> : null}
            {"description" in item && item.description ? <small>{item.description}</small> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

export function PricingPage() {
  const { t } = useApp();
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{
    isFreeAccess: boolean;
    discountStars?: number;
    finalStars?: number;
    productTitle?: string;
    activeProductTitle?: string | null;
    accessUntil?: string | null;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) ?? products[0] ?? null,
    [products, selectedProductId],
  );

  useEffect(() => {
    Promise.all([api.access(), api.products(), api.banners(), api.promotions(), api.news()])
      .then(([accessData, productData, bannerData, promotionData, newsData]) => {
        setAccess(accessData);
        setProducts(productData);
        setBanners(bannerData);
        setPromotions(promotionData);
        setNews(newsData);
        if (!selectedProductId && productData[0]) setSelectedProductId(productData[0].id);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Failed to load pricing."));
  }, []);

  async function applyPromo() {
    if (!selectedProduct) return;
    setMessage(null);
    try {
      const result = await api.applyPromoCode(promoCode, selectedProduct.id);
      setPromoResult(result);
      if (result.isFreeAccess) {
        setAccess(await api.access());
      }
    } catch (error) {
      setPromoResult(null);
      setMessage(error instanceof Error ? error.message : "Invalid promo code.");
    }
  }

  async function buy(product: Product) {
    setMessage(null);
    try {
      const result = await api.createInvoice(product.id, promoCode.trim());
      if (result.amountStarsFinal <= 0) {
        setAccess(await api.access());
        setMessage(t("pricing.freeAccessGranted"));
        return;
      }
      openInvoice(result.invoiceLink);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start payment.");
    }
  }

  return (
    <section>
      <p className="eyebrow">{t("pricing.eyebrow")}</p>
      <h1>{t("pricing.title")}</h1>
      <p className="page-intro">{t("pricing.intro")}</p>

      {message && <div className="feedback feedback--wrong"><strong>{message}</strong></div>}

      {access && (
        <section className="focus-panel">
          <div>
            <span className="tag">{t("pricing.accessStatus")}</span>
            <h2>{access.hasActiveAccess ? t("pricing.accessActive") : t("pricing.accessInactive")}</h2>
            <p>
              {access.hasActiveAccess
                ? access.isLifetime
                  ? t("pricing.lifetimeAccess")
                  : t("pricing.accessUntil", { date: access.accessUntil ? new Date(access.accessUntil).toLocaleDateString() : "-" })
                : t("pricing.noAccess")}
            </p>
          </div>
        </section>
      )}

      <section className="menu-list">
        <div className="question-row">
          <div>
            <span className="tag">{t("pricing.promoTitle")}</span>
            <strong>{t("pricing.enterPromo")}</strong>
            <small>{t("pricing.promoHint")}</small>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, paddingBottom: 18 }}>
          <input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder={t("pricing.promoPlaceholder")} />
          <button className="button button--primary" onClick={applyPromo} disabled={!promoCode.trim() || !selectedProduct}>
            {t("pricing.applyPromo")}
          </button>
          {promoResult && (
            <div className="feedback feedback--correct">
              <strong>{promoResult.isFreeAccess ? t("pricing.freePromoTitle") : t("pricing.discountPromoTitle")}</strong>
              <p>
                {promoResult.isFreeAccess
                  ? t("pricing.freeAccessGranted")
                  : t("pricing.finalPrice", { price: promoResult.finalStars ?? 0, discount: promoResult.discountStars ?? 0 })}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="action-grid">
        {products.map((product) => (
          <button
            key={product.id}
            className={`action-tile ${selectedProduct?.id === product.id ? "action-tile--dark" : ""}`}
            onClick={() => setSelectedProductId(product.id)}
            type="button"
          >
            <strong>{product.title}</strong>
            <span>
              {product.badgeText ? `${product.badgeText} · ` : ""}
              {product.priceStars} ⭐ {product.oldPriceStars ? <s>{product.oldPriceStars} ⭐</s> : null}
            </span>
            <small>{product.description ?? t("pricing.noDescription")}</small>
          </button>
        ))}
      </div>

      {selectedProduct && (
        <section className="focus-panel">
          <div>
            <span className="tag">{t("pricing.selectedPlan")}</span>
            <h2>{selectedProduct.title}</h2>
            <p>
              {promoResult?.finalStars
                ? t("pricing.finalPrice", { price: promoResult.finalStars, discount: promoResult.discountStars ?? 0 })
                : `${selectedProduct.priceStars} ⭐`}
            </p>
          </div>
          <button className="button button--primary" onClick={() => buy(selectedProduct)}>
            {t("pricing.buy")}
          </button>
        </section>
      )}

      <PlacementSection title={t("pricing.banners")} items={banners} />
      <PlacementSection title={t("pricing.promotions")} items={promotions} />
      <PlacementSection title={t("pricing.news")} items={news} />
    </section>
  );
}
