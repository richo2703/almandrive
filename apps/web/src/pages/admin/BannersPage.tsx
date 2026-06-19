import "../../i18n/admin";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Banner, type BannerInput, type Language } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { ImageUploader } from "../../components/admin/ImageUploader";
import { PhonePreviewFrame } from "../../components/admin/PhonePreviewFrame";
import { SortableList, SortableRow } from "../../components/admin/SortableList";
import { Toggle } from "../../components/admin/Toggle";

const placements = ["HOME_TOP", "HOME_MIDDLE", "PRICING_TOP", "QUIZ_BOTTOM", "LEARN_TOP"] as const;

const emptyBanner: BannerInput = {
  imageUrl: null,
  title: "",
  subtitle: "",
  buttonText: "",
  buttonUrl: "",
  placement: "HOME_TOP",
  languageCode: "all",
  isActive: true,
  sortOrder: 0,
  validFrom: null,
  validUntil: null,
};

export function BannersPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [items, setItems] = useState<Banner[]>([]);
  const [draft, setDraft] = useState<BannerInput>(emptyBanner);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminBanners(), api.adminMetaLanguages()])
      .then(([bannerRows, languageRows]) => {
        setItems(bannerRows);
        setLanguages(languageRows);
        setSelectedId(bannerRows[0]?.id ?? null);
        if (bannerRows[0]) setDraft(fromBanner(bannerRows[0]));
      })
      .catch(() => {
        setItems([]);
        setLanguages([]);
      });
  }, [isAdmin]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  if (!isAdmin) return null;

  async function save() {
    const payload = normalizeBanner(draft);
    if (selectedId) await api.adminUpdateBanner(selectedId, payload);
    else await api.adminCreateBanner(payload);
    const fresh = await api.adminBanners();
    setItems(fresh);
    setSelectedId(fresh[0]?.id ?? null);
    setDraft(fromBanner(fresh[0] ?? emptyBannerAsBanner()));
  }

  async function remove(id: string) {
    await api.adminDeleteBanner(id);
    const fresh = await api.adminBanners();
    setItems(fresh);
    setSelectedId(fresh[0]?.id ?? null);
    setDraft(fromBanner(fresh[0] ?? emptyBannerAsBanner()));
  }

  async function reorder(nextIds: string[]) {
    setItems(nextIds.map((id, index) => items.find((item) => item.id === id) ?? { ...(items[0] as Banner), id, sortOrder: index }));
    await Promise.all(nextIds.map((id, index) => api.adminUpdateBanner(id, { sortOrder: index })));
    setItems(await api.adminBanners());
  }

  return (
    <div className="admin-three-col">
      <AdminCard title={t("banners.title")} subtitle={t("banners.new")}>
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
                    setDraft(fromBanner(item));
                  }}
                >
                  <div className="admin-item__header">
                    <strong>{item.title}</strong>
                    <span>{item.isActive ? t("common.active") : t("common.inactive")}</span>
                  </div>
                  <p>{item.placement}</p>
                </button>
              </SortableRow>
            );
          }}
        </SortableList>
        <AdminButton variant="primary" type="button" onClick={() => { setSelectedId(null); setDraft(emptyBanner); }}>
          {t("banners.new")}
        </AdminButton>
      </AdminCard>

      <AdminCard title={draft.title || t("banners.title")} subtitle={t("banners.content")}>
        <BannerForm
          draft={draft}
          languages={languages}
          onChange={setDraft}
          onSave={save}
          onDelete={selected ? () => void remove(selected.id) : undefined}
          onCancel={() => {
            setSelectedId(items[0]?.id ?? null);
            setDraft(fromBanner(items[0] ?? emptyBannerAsBanner()));
          }}
        />
      </AdminCard>

      <AdminCard title={t("preview.title")}>
        <PhonePreviewFrame>
          <div className="banner-preview">
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" /> : null}
            <h3>{draft.title || t("banners.titleField")}</h3>
            {draft.subtitle ? <p>{draft.subtitle}</p> : null}
            {draft.buttonText ? <button type="button" className="admin-button admin-button--primary">{draft.buttonText}</button> : null}
          </div>
        </PhonePreviewFrame>
      </AdminCard>
    </div>
  );
}

function BannerForm({
  draft,
  onChange,
  onSave,
  onDelete,
  onCancel,
  languages,
}: {
  draft: BannerInput;
  onChange(next: BannerInput): void;
  onSave(): Promise<void>;
  onDelete?: () => void;
  onCancel(): void;
  languages: Language[];
}) {
  const { t } = useTranslation("translation");
  return (
    <div className="admin-form">
      <ImageUploader value={draft.imageUrl} onChange={(url) => onChange({ ...draft, imageUrl: url })} category="banners" label={t("banners.image")} />
      <label className="admin-field"><span>{t("banners.titleField")}</span><input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} /></label>
      <label className="admin-field"><span>{t("banners.subtitle")}</span><input value={draft.subtitle ?? ""} onChange={(event) => onChange({ ...draft, subtitle: event.target.value })} /></label>
      <label className="admin-field"><span>{t("banners.buttonText")}</span><input value={draft.buttonText ?? ""} onChange={(event) => onChange({ ...draft, buttonText: event.target.value })} /></label>
      <label className="admin-field"><span>{t("banners.buttonLink")}</span><input value={draft.buttonUrl ?? ""} onChange={(event) => onChange({ ...draft, buttonUrl: event.target.value })} /></label>
      <div className="admin-grid admin-grid--2">
        <label className="admin-field">
          <span>{t("banners.whereToShow")}</span>
          <select value={draft.placement} onChange={(event) => onChange({ ...draft, placement: event.target.value as BannerInput["placement"] })}>
            {placements.map((placement) => (
              <option key={placement} value={placement}>
                {t(`banners.placement.${placement}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>{t("banners.showForLanguages")}</span>
          <select value={draft.languageCode ?? "all"} onChange={(event) => onChange({ ...draft, languageCode: event.target.value })}>
            <option value="all">{t("banners.all")}</option>
            {languages.map((language) => <option key={language.code} value={language.code}>{language.code.toUpperCase()} · {language.name}</option>)}
          </select>
        </label>
      </div>
      <div className="admin-grid admin-grid--2">
        <label className="admin-field">
          <span>{t("banners.showFrom")}</span>
          <input type="datetime-local" value={dateInput(draft.validFrom)} onChange={(event) => onChange({ ...draft, validFrom: parseDateInput(event.target.value) })} />
        </label>
        <label className="admin-field">
          <span>{t("banners.showUntil")}</span>
          <input type="datetime-local" value={dateInput(draft.validUntil)} onChange={(event) => onChange({ ...draft, validUntil: parseDateInput(event.target.value) })} />
        </label>
      </div>
      <Toggle checked={draft.isActive} onChange={(value) => onChange({ ...draft, isActive: value })} label={t("banners.active")} />
      <div className="admin-actions">
        <AdminButton variant="primary" type="button" onClick={() => void onSave()}>{t("common.save")}</AdminButton>
        <AdminButton variant="secondary" type="button" onClick={onCancel}>{t("common.cancel")}</AdminButton>
        {onDelete ? <AdminButton variant="danger" type="button" onClick={onDelete}>{t("common.delete")}</AdminButton> : null}
      </div>
    </div>
  );
}

function normalizeBanner(banner: BannerInput): BannerInput {
  return {
    ...banner,
    subtitle: banner.subtitle || null,
    buttonText: banner.buttonText || null,
    buttonUrl: banner.buttonUrl || null,
    validFrom: banner.validFrom || null,
    validUntil: banner.validUntil || null,
    languageCode: banner.languageCode === "all" ? null : banner.languageCode,
  };
}

function fromBanner(banner: Banner): BannerInput {
  return {
    imageUrl: banner.imageUrl,
    title: banner.title,
    subtitle: banner.subtitle ?? "",
    buttonText: banner.buttonText ?? "",
    buttonUrl: banner.buttonUrl ?? "",
    placement: banner.placement,
    languageCode: banner.languageCode ?? "all",
    isActive: banner.isActive,
    sortOrder: banner.sortOrder,
    validFrom: banner.validFrom,
    validUntil: banner.validUntil,
  };
}

function emptyBannerAsBanner(): Banner {
  return {
    id: "",
    imageUrl: null,
    title: "",
    subtitle: null,
    buttonText: null,
    buttonUrl: null,
    placement: "HOME_TOP",
    languageCode: null,
    isActive: true,
    sortOrder: 0,
    validFrom: null,
    validUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Banner;
}

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function parseDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
