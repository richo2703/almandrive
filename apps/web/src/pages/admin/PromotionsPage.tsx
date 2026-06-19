import "../../i18n/admin";
import { Megaphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { ImageUploader } from "../../components/admin/ImageUploader";
import { Input } from "../../components/admin/Input";
import { PhonePreviewFrame } from "../../components/admin/PhonePreviewFrame";
import { Select } from "../../components/admin/Select";
import { Textarea } from "../../components/admin/Textarea";
import { Toggle } from "../../components/admin/Toggle";
import { api, type Product, type PromoCode, type Promotion, type PromotionInput } from "../../lib/api";
import { useApp } from "../../context/AppContext";

const emptyPromotion: PromotionInput = {
  imageUrl: null,
  title: "",
  description: "",
  buttonText: "",
  buttonUrl: "",
  linkedProductId: null,
  promoCodeId: null,
  languageCode: "all",
  isActive: true,
  validFrom: null,
  validUntil: null,
  sortOrder: 0,
};

export function PromotionsPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [items, setItems] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromotionInput>(emptyPromotion);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminPromotions(), api.adminProducts(), api.adminPromoCodes()])
      .then(([promotionRows, productRows, promoRows]) => {
        setItems(promotionRows);
        setProducts(productRows);
        setPromoCodes(promoRows);
        setSelectedId(promotionRows[0]?.id ?? null);
        if (promotionRows[0]) setDraft(fromPromotion(promotionRows[0]));
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  if (!isAdmin) return null;

  async function reload(editingId = selectedId) {
    const fresh = await api.adminPromotions();
    setItems(fresh);
    const next = editingId ? fresh.find((item) => item.id === editingId) : fresh[0];
    setSelectedId(next?.id ?? null);
    setDraft(next ? fromPromotion(next) : emptyPromotion);
  }

  async function save() {
    try {
      const payload = normalizePromotion(draft);
      if (selectedId) await api.adminUpdatePromotion(selectedId, payload);
      else await api.adminCreatePromotion(payload);
      await reload(selectedId);
      toast.success(t("toasts.promotionSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveFailed"));
    }
  }

  async function remove() {
    if (!selectedId) return;
    try {
      await api.adminDeletePromotion(selectedId);
      await reload(null);
      toast.success(t("toasts.promotionDeleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.deleteFailed"));
    }
  }

  return (
    <div className="admin-three-col">
      <AdminCard title={t("promotions.title")} subtitle={t("promotions.subtitle")}>
        {loading ? <div className="admin-skeleton-list"><span /><span /><span /></div> : null}
        {!loading && items.length === 0 ? (
          <div className="admin-empty">
            <Megaphone size={24} />
            <p>{t("promotions.empty")}</p>
            <AdminButton variant="primary" type="button" onClick={() => { setSelectedId(null); setDraft(emptyPromotion); }}>{t("promotions.new")}</AdminButton>
          </div>
        ) : null}
        <div className="admin-list">
          {items.map((item) => (
            <button
              className={`admin-record-card ${selectedId === item.id ? "is-selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setDraft(fromPromotion(item));
              }}
            >
              <strong>{item.title}</strong>
              <span className={`admin-status ${item.isActive ? "is-success" : "is-muted"}`}>{item.isActive ? t("common.active") : t("common.inactive")}</span>
              <p>{item.languageCode?.toUpperCase() ?? t("common.all")}</p>
            </button>
          ))}
        </div>
        <AdminButton variant="primary" type="button" onClick={() => { setSelectedId(null); setDraft(emptyPromotion); }}>{t("promotions.new")}</AdminButton>
      </AdminCard>

      <AdminCard title={draft.title || t("promotions.new")} subtitle={t("promotions.form")}>
        <div className="admin-form">
          <ImageUploader value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} category="promotions" label={t("promotions.image")} />
          <Input label={t("promotions.titleField")} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <Textarea label={t("promotions.description")} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <Input label={t("promotions.buttonText")} value={draft.buttonText ?? ""} onChange={(event) => setDraft({ ...draft, buttonText: event.target.value })} />
          <Input label={t("promotions.buttonUrl")} value={draft.buttonUrl ?? ""} onChange={(event) => setDraft({ ...draft, buttonUrl: event.target.value })} />
          <Select
            label={t("promotions.linkedProduct")}
            value={draft.linkedProductId ?? "none"}
            onChange={(value) => setDraft({ ...draft, linkedProductId: value === "none" ? null : value })}
            options={[{ value: "none", label: t("common.none") }, ...products.map((product) => ({ value: product.id, label: product.title }))]}
          />
          <Select
            label={t("promotions.linkedPromoCode")}
            value={draft.promoCodeId ?? "none"}
            onChange={(value) => setDraft({ ...draft, promoCodeId: value === "none" ? null : value })}
            options={[{ value: "none", label: t("common.none") }, ...promoCodes.map((promoCode) => ({ value: promoCode.id, label: promoCode.code }))]}
          />
          <div className="admin-grid admin-grid--2">
            <Select
              label={t("promotions.language")}
              value={draft.languageCode ?? "all"}
              onChange={(value) => setDraft({ ...draft, languageCode: value })}
              options={["all", "ru", "en", "de"].map((code) => ({ value: code, label: code === "all" ? t("common.all") : code.toUpperCase() }))}
            />
            <Input label={t("promotions.sortOrder")} type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} />
          </div>
          <Toggle checked={draft.isActive} onChange={(value) => setDraft({ ...draft, isActive: value })} label={t("promotions.active")} />
          <div className="admin-actions">
            <AdminButton variant="primary" type="button" onClick={() => void save()}>{t("common.save")}</AdminButton>
            <AdminButton type="button" onClick={() => { setSelectedId(items[0]?.id ?? null); setDraft(items[0] ? fromPromotion(items[0]) : emptyPromotion); }}>{t("common.cancel")}</AdminButton>
            {selected ? <AdminButton variant="danger" type="button" onClick={() => void remove()}>{t("common.delete")}</AdminButton> : null}
          </div>
        </div>
      </AdminCard>

      <AdminCard title={t("preview.title")}>
        <PhonePreviewFrame>
          <article className="promotion-preview">
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" /> : null}
            <h3>{draft.title || t("promotions.titleField")}</h3>
            {draft.description ? <p>{draft.description}</p> : null}
            {draft.buttonText ? <button type="button" className="admin-button admin-button--primary">{draft.buttonText}</button> : null}
          </article>
        </PhonePreviewFrame>
      </AdminCard>
    </div>
  );
}

function fromPromotion(item: Promotion): PromotionInput {
  return {
    imageUrl: item.imageUrl,
    title: item.title,
    description: item.description ?? "",
    buttonText: item.buttonText ?? "",
    buttonUrl: item.buttonUrl ?? "",
    linkedProductId: item.linkedProductId,
    promoCodeId: item.promoCodeId,
    languageCode: item.languageCode ?? "all",
    isActive: item.isActive,
    validFrom: item.validFrom,
    validUntil: item.validUntil,
    sortOrder: item.sortOrder,
  };
}

function normalizePromotion(draft: PromotionInput): PromotionInput {
  return {
    ...draft,
    description: draft.description || null,
    buttonText: draft.buttonText || null,
    buttonUrl: draft.buttonUrl || null,
    linkedProductId: draft.linkedProductId || null,
    promoCodeId: draft.promoCodeId || null,
    languageCode: draft.languageCode === "all" ? null : draft.languageCode,
    validFrom: draft.validFrom || null,
    validUntil: draft.validUntil || null,
  };
}
