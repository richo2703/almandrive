import "../../i18n/admin";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api, type Product, type ProductInput } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { Input } from "../../components/admin/Input";
import { Textarea } from "../../components/admin/Textarea";
import { Toggle } from "../../components/admin/Toggle";
import { PhonePreviewFrame } from "../../components/admin/PhonePreviewFrame";
import { SortableList, SortableRow } from "../../components/admin/SortableList";

const emptyProduct: ProductInput = {
  title: "",
  description: "",
  priceStars: 25,
  accessDays: 1,
  isLifetime: false,
  isActive: true,
  sortOrder: 0,
  badgeText: "",
  oldPriceStars: null,
};

export function ProductsPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [items, setItems] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductInput>(emptyProduct);

  useEffect(() => {
    if (!isAdmin) return;
    api.adminProducts().then((rows) => {
      setItems(rows);
      setSelectedId(rows[0]?.id ?? null);
      if (rows[0]) {
        setDraft(fromProduct(rows[0]));
      }
    });
  }, [isAdmin]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  if (!isAdmin) return null;

  async function persist(next: ProductInput, editingId: string | null = selectedId) {
    const payload = {
      ...next,
      description: next.description || null,
      badgeText: next.badgeText || null,
      oldPriceStars: next.oldPriceStars ?? null,
      accessDays: next.isLifetime ? null : next.accessDays,
    };
    if (editingId) {
      await api.adminUpdateProduct(editingId, payload);
    } else {
      await api.adminCreateProduct(payload);
    }
    const fresh = await api.adminProducts();
    setItems(fresh);
    if (editingId) {
      setSelectedId(editingId);
      setDraft(fromProduct(fresh.find((item) => item.id === editingId) ?? fresh[0] ?? emptyProductAsProduct()));
    } else {
      setSelectedId(fresh[0]?.id ?? null);
      setDraft(fromProduct(fresh[0] ?? emptyProductAsProduct()));
    }
  }

  async function save() {
    try {
      await persist(draft);
      toast.success(t("toasts.productSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveFailed"));
    }
  }

  async function remove(id: string) {
    try {
      const result = await api.adminDeleteProduct(id);
      toast.success(result.deactivated && result.product ? t("products.deletePaidOrders") : t("toasts.productDeleted"));
      const fresh = await api.adminProducts();
      setItems(fresh);
      setSelectedId(fresh[0]?.id ?? null);
      setDraft(fromProduct(fresh[0] ?? emptyProductAsProduct()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.deleteFailed"));
    }
  }

  async function reorder(nextIds: string[]) {
    const ordered = nextIds.map((id, index) => ({ id, sortOrder: index }));
    setItems((current) =>
      nextIds.map((id, index) => current.find((item) => item.id === id) ?? { ...(current[0] as Product), id, sortOrder: index }),
    );
    await Promise.all(
      ordered.map(({ id, sortOrder }) =>
        api.adminUpdateProduct(id, { sortOrder }),
      ),
    );
    setItems(await api.adminProducts());
  }

  return (
    <div className="admin-three-col">
      <AdminCard title={t("products.title")} subtitle={t("products.new")}>
        <SortableList items={items.map((item) => item.id)} onReorder={reorder}>
          {(id) => {
            const item = items.find((entry) => entry.id === id);
            if (!item) return null;
            return (
              <SortableRow id={id}>
                <button
                  type="button"
                  className={`admin-item ${selectedId === id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedId(id);
                    setDraft(fromProduct(item));
                  }}
                >
                  <div className="admin-item__header">
                    <strong>{item.title}</strong>
                    <span>{item.isActive ? t("common.active") : t("common.inactive")}</span>
                  </div>
                  <p>{item.priceStars} ⭐{item.badgeText ? ` · ${item.badgeText}` : ""}</p>
                </button>
              </SortableRow>
            );
          }}
        </SortableList>
        <AdminButton
          variant="primary"
          type="button"
          onClick={() => {
            setSelectedId(null);
            setDraft(emptyProduct);
          }}
        >
          {t("products.new")}
        </AdminButton>
      </AdminCard>

      <AdminCard title={selected ? selected.title : t("products.new")} subtitle={t("preview.title")}>
        <ProductForm
          draft={draft}
          onChange={setDraft}
          onSave={save}
          onDelete={selected ? () => void remove(selected.id) : undefined}
          onCancel={() => {
            setSelectedId(items[0]?.id ?? null);
            setDraft(fromProduct(items[0] ?? emptyProductAsProduct()));
          }}
        />
      </AdminCard>

      <AdminCard title={t("preview.title")}>
        <PhonePreviewFrame>
          <div className="pricing-preview">
            <article className={`pricing-preview__card ${draft.isLifetime ? "is-lifetime" : ""}`}>
              {draft.badgeText ? <span className="pricing-preview__badge">{draft.badgeText}</span> : null}
              <h3>{draft.title || t("products.productName")}</h3>
              <p className="pricing-preview__price">
                {draft.oldPriceStars ? <s>{draft.oldPriceStars} ⭐</s> : null}
                <strong>{draft.priceStars || 0} ⭐</strong>
              </p>
              <p>{draft.description || t("products.description")}</p>
              <button type="button" className="admin-button admin-button--primary">
                {draft.isLifetime ? `${t("products.lifetime")} · ${draft.priceStars} ⭐` : `${draft.accessDays ?? 1} days · ${draft.priceStars} ⭐`}
              </button>
            </article>
          </div>
        </PhonePreviewFrame>
      </AdminCard>
    </div>
  );
}

function emptyProductAsProduct(): Product {
  return {
    id: "",
    title: "",
    description: null,
    priceStars: 25,
    accessDays: 1,
    isLifetime: false,
    isActive: true,
    sortOrder: 0,
    badgeText: null,
    oldPriceStars: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Product;
}

function fromProduct(product: Product): ProductInput {
  return {
    title: product.title,
    description: product.description ?? "",
    priceStars: product.priceStars,
    accessDays: product.accessDays ?? 1,
    isLifetime: product.isLifetime,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    badgeText: product.badgeText ?? "",
    oldPriceStars: product.oldPriceStars,
  };
}

function ProductForm({
  draft,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: {
  draft: ProductInput;
  onChange(next: ProductInput): void;
  onSave(): Promise<void>;
  onDelete?: () => void;
  onCancel(): void;
}) {
  const { t } = useTranslation("translation");
  return (
    <div className="admin-form">
      <Input label={t("products.productName")} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      <Textarea label={t("products.description")} value={draft.description ?? ""} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
      <Input label={t("products.badge")} value={draft.badgeText ?? ""} onChange={(event) => onChange({ ...draft, badgeText: event.target.value })} placeholder={t("products.badgeHint")} />
      <div className="admin-grid admin-grid--2">
        <Input label={t("products.price")} type="number" min={1} value={draft.priceStars} onChange={(event) => onChange({ ...draft, priceStars: Number(event.target.value) })} />
        <Input label={t("products.oldPrice")} type="number" min={1} value={draft.oldPriceStars ?? ""} onChange={(event) => onChange({ ...draft, oldPriceStars: event.target.value ? Number(event.target.value) : null })} placeholder={t("products.oldPriceHint")} />
      </div>
      <Toggle checked={draft.isLifetime} onChange={(value) => onChange({ ...draft, isLifetime: value })} label={t("products.lifetime")} />
      {!draft.isLifetime ? (
        <Input label={t("products.accessDays")} type="number" min={1} value={draft.accessDays ?? 1} onChange={(event) => onChange({ ...draft, accessDays: Number(event.target.value) })} />
      ) : null}
      <Toggle checked={draft.isActive} onChange={(value) => onChange({ ...draft, isActive: value })} label={t("products.active")} />
      <div className="admin-actions">
        <AdminButton variant="primary" type="button" onClick={() => void onSave()}>
          {t("common.save")}
        </AdminButton>
        <AdminButton variant="secondary" type="button" onClick={onCancel}>
          {t("common.cancel")}
        </AdminButton>
        {onDelete ? (
          <AdminButton variant="danger" type="button" onClick={onDelete}>
            {t("common.delete")}
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
