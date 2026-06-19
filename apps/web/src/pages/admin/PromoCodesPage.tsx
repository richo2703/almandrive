import "../../i18n/admin";
import { Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { DateTimePicker } from "../../components/admin/DateTimePicker";
import { Input } from "../../components/admin/Input";
import { Select } from "../../components/admin/Select";
import { Toggle } from "../../components/admin/Toggle";
import { api, type Product, type PromoCode, type PromoCodeInput, type UserRecord } from "../../lib/api";
import { useApp } from "../../context/AppContext";

const emptyPromoCode: PromoCodeInput = {
  code: "",
  type: "FREE_ACCESS",
  discountPercent: null,
  discountStars: null,
  accessDays: 1,
  isLifetime: false,
  maxUses: null,
  maxUsesPerUser: null,
  validFrom: null,
  validUntil: null,
  isActive: true,
  sortOrder: 0,
};

export function PromoCodesPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [items, setItems] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromoCodeInput>(emptyPromoCode);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminPromoCodes(), api.adminProducts()])
      .then(([promoRows, productRows]) => {
        setItems(promoRows);
        setProducts(productRows);
        setSelectedId(promoRows[0]?.id ?? null);
        if (promoRows[0]) setDraft(fromPromoCode(promoRows[0]));
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  if (!isAdmin) return null;

  async function reload(editingId = selectedId) {
    const fresh = await api.adminPromoCodes();
    setItems(fresh);
    const next = editingId ? fresh.find((item) => item.id === editingId) : fresh[0];
    setSelectedId(next?.id ?? null);
    setDraft(next ? fromPromoCode(next) : emptyPromoCode);
  }

  async function save() {
    const payload = normalizePromoCode(draft);
    if (selectedId) await api.adminUpdatePromoCode(selectedId, payload);
    else await api.adminCreatePromoCode(payload);
    await reload(selectedId);
  }

  async function deactivate() {
    if (!selectedId) return;
    await api.adminDeletePromoCode(selectedId);
    await reload();
  }

  return (
    <div className="admin-three-col">
      <AdminCard title={t("promoCodes.title")} subtitle={t("promoCodes.subtitle")}>
        {loading ? <SkeletonList /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState
            label={t("promoCodes.empty")}
            action={t("promoCodes.new")}
            onClick={() => {
              setSelectedId(null);
              setDraft(emptyPromoCode);
            }}
          />
        ) : null}
        <div className="admin-list">
          {items.map((item) => (
            <button
              className={`admin-record-card ${selectedId === item.id ? "is-selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setDraft(fromPromoCode(item));
              }}
            >
              <span className="admin-mono">{item.code}</span>
              <span className="admin-badge">{t(`promoCodes.types.${item.type}`)}</span>
              <span className={`admin-status ${item.isActive ? "is-success" : "is-muted"}`}>
                {item.isActive ? t("common.active") : t("common.inactive")}
              </span>
            </button>
          ))}
        </div>
        <AdminButton
          variant="primary"
          type="button"
          onClick={() => {
            setSelectedId(null);
            setDraft({ ...emptyPromoCode, code: generateCode() });
          }}
        >
          {t("promoCodes.new")}
        </AdminButton>
      </AdminCard>

      <AdminCard title={selected ? selected.code : t("promoCodes.new")} subtitle={t("promoCodes.form")}>
        <div className="admin-form">
          <div className="admin-inline-field">
            <Input
              label={t("promoCodes.code")}
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
            />
            <AdminButton type="button" onClick={() => setDraft({ ...draft, code: generateCode() })}>
              {t("promoCodes.generate")}
            </AdminButton>
          </div>
          <Select
            label={t("promoCodes.type")}
            value={draft.type}
            onChange={(value) => setDraft({ ...draft, type: value as PromoCodeInput["type"] })}
            options={["FREE_ACCESS", "PERCENT_DISCOUNT", "FIXED_STARS_DISCOUNT"].map((type) => ({
              value: type,
              label: t(`promoCodes.types.${type}`),
            }))}
          />
          {draft.type === "PERCENT_DISCOUNT" ? (
            <Input label={t("promoCodes.discountPercent")} type="number" min={1} max={100} value={draft.discountPercent ?? ""} onChange={(event) => setDraft({ ...draft, discountPercent: numberOrNull(event.target.value) })} />
          ) : null}
          {draft.type === "FIXED_STARS_DISCOUNT" ? (
            <Input label={t("promoCodes.discountStars")} type="number" min={1} value={draft.discountStars ?? ""} onChange={(event) => setDraft({ ...draft, discountStars: numberOrNull(event.target.value) })} />
          ) : null}
          <div className="admin-grid admin-grid--2">
            <Input label={t("promoCodes.accessDays")} type="number" min={1} value={draft.accessDays ?? ""} onChange={(event) => setDraft({ ...draft, accessDays: numberOrNull(event.target.value) })} />
            <Input label={t("promoCodes.sortOrder")} type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} />
          </div>
          <Toggle checked={draft.isLifetime} onChange={(value) => setDraft({ ...draft, isLifetime: value })} label={t("promoCodes.lifetime")} />
          <div className="admin-grid admin-grid--2">
            <Input label={t("promoCodes.maxUses")} type="number" min={1} value={draft.maxUses ?? ""} onChange={(event) => setDraft({ ...draft, maxUses: numberOrNull(event.target.value) })} />
            <Input label={t("promoCodes.maxUsesPerUser")} type="number" min={1} value={draft.maxUsesPerUser ?? ""} onChange={(event) => setDraft({ ...draft, maxUsesPerUser: numberOrNull(event.target.value) })} />
          </div>
          <div className="admin-grid admin-grid--2">
            <DateTimePicker label={t("promoCodes.validFrom")} value={dateInput(draft.validFrom)} onChange={(value) => setDraft({ ...draft, validFrom: parseDateInput(value) })} />
            <DateTimePicker label={t("promoCodes.validUntil")} value={dateInput(draft.validUntil)} onChange={(value) => setDraft({ ...draft, validUntil: parseDateInput(value) })} />
          </div>
          <Select
            label={t("promoCodes.linkedProduct")}
            value="unsupported"
            onChange={() => undefined}
            options={[
              { value: "unsupported", label: t("promoCodes.linkedProductUnavailable") },
              ...products.map((product) => ({ value: product.id, label: product.title, disabled: true })),
            ]}
          />
          <Toggle checked={draft.isActive} onChange={(value) => setDraft({ ...draft, isActive: value })} label={t("promoCodes.active")} />
          <div className="admin-actions">
            <AdminButton variant="primary" type="button" onClick={() => void save()}>{t("common.save")}</AdminButton>
            <AdminButton variant="secondary" type="button" onClick={() => { setSelectedId(items[0]?.id ?? null); setDraft(items[0] ? fromPromoCode(items[0]) : emptyPromoCode); }}>{t("common.cancel")}</AdminButton>
            {selected ? <AdminButton variant="danger" type="button" onClick={() => void deactivate()}>{t("promoCodes.deactivate")}</AdminButton> : null}
          </div>
        </div>
      </AdminCard>

      <AdminCard title={t("promoCodes.usage")}>
        {selected ? (
          <div className="admin-usage">
            <div className="admin-metric">
              <strong>{selected.usages?.length ?? 0}</strong>
              <span>{t("promoCodes.totalUses")}</span>
            </div>
            <div className="admin-list">
              {(selected.usages ?? []).map((usage) => (
                <article className="admin-list__item" key={usage.id}>
                  <div>
                    <strong>{displayUser(usage.user)}</strong>
                    <p>{formatDateTime(usage.usedAt)} · {usage.discountStarsApplied} ⭐</p>
                  </div>
                </article>
              ))}
              {(selected.usages?.length ?? 0) === 0 ? <p className="admin-muted">{t("promoCodes.noUsage")}</p> : null}
            </div>
          </div>
        ) : (
          <p className="admin-muted">{t("promoCodes.selectForUsage")}</p>
        )}
      </AdminCard>
    </div>
  );
}

function fromPromoCode(item: PromoCode): PromoCodeInput {
  return {
    code: item.code,
    type: item.type,
    discountPercent: item.discountPercent,
    discountStars: item.discountStars,
    accessDays: item.accessDays,
    isLifetime: item.isLifetime,
    maxUses: item.maxUses,
    maxUsesPerUser: item.maxUsesPerUser,
    validFrom: item.validFrom,
    validUntil: item.validUntil,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

function normalizePromoCode(draft: PromoCodeInput): PromoCodeInput {
  return {
    ...draft,
    code: draft.code.trim().toUpperCase(),
    discountPercent: draft.type === "PERCENT_DISCOUNT" ? draft.discountPercent : null,
    discountStars: draft.type === "FIXED_STARS_DISCOUNT" ? draft.discountStars : null,
    validFrom: draft.validFrom || null,
    validUntil: draft.validUntil || null,
    accessDays: draft.isLifetime ? null : draft.accessDays,
  };
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function numberOrNull(value: string) {
  return value ? Number(value) : null;
}

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function parseDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayUser(user: UserRecord) {
  if (!user) return "User";
  const record = user as { firstName?: string | null; lastName?: string | null; username?: string | null; telegramId?: string | null };
  const name = [record.firstName, record.lastName].filter(Boolean).join(" ");
  return name || record.username || record.telegramId || "User";
}

function SkeletonList() {
  return (
    <div className="admin-skeleton-list">
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState({ label, action, onClick }: { label: string; action: string; onClick(): void }) {
  return (
    <div className="admin-empty">
      <Tag size={24} />
      <p>{label}</p>
      <AdminButton variant="primary" type="button" onClick={onClick}>{action}</AdminButton>
    </div>
  );
}
