import "../../i18n/admin";
import { ChevronLeft, ChevronRight, Shield, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { Checkbox } from "../../components/admin/Checkbox";
import { Input } from "../../components/admin/Input";
import { Select } from "../../components/admin/Select";
import { Textarea } from "../../components/admin/Textarea";
import { api, type AdminUsersResponse, type Category, type CreateUserInput, type Language, type UserDetail, type UserRecord } from "../../lib/api";
import { useApp } from "../../context/AppContext";

const emptyCreate = {
  telegramId: "",
  username: "",
  firstName: "",
  lastName: "",
  languageCode: "en",
  categoryCode: "B",
  adminNote: "",
  grantAccess: false,
  accessDays: 30,
  isLifetime: false,
  reason: "",
};

export function UsersPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [queryDraft, setQueryDraft] = useState(searchParams.get("q") ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(emptyCreate);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const query = searchParams.get("q") ?? "";
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  useEffect(() => setQueryDraft(query), [query]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminMetaLanguages(), api.adminMetaCategories()])
      .then(([languageRows, categoryRows]) => {
        setLanguages(languageRows);
        setCategories(categoryRows);
      })
      .catch(() => {
        setLanguages([]);
        setCategories([]);
      });
  }, [isAdmin]);

  async function loadUsers(nextPage = page) {
    setLoading(true);
    try {
      const response = await api.adminUsers({ q: query || undefined, page: nextPage, limit: 50, includeDeleted });
      setUsers(response);
      return response;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [isAdmin, query, page, includeDeleted]);

  if (!isAdmin) return null;

  function updateParams(next: { q?: string; page?: number; includeDeleted?: boolean }) {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) next.q ? params.set("q", next.q) : params.delete("q");
    if (next.page !== undefined) params.set("page", String(next.page));
    if (next.includeDeleted !== undefined) next.includeDeleted ? params.set("includeDeleted", "true") : params.delete("includeDeleted");
    setSearchParams(params);
  }

  async function openUser(userId: string) {
    const detail = await api.adminUser(userId);
    setSelected(detail);
    setConfirmPhrase("");
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateUserInput = {
      telegramId: createDraft.telegramId,
      username: createDraft.username.trim() || null,
      firstName: createDraft.firstName.trim() || null,
      lastName: createDraft.lastName.trim() || null,
      languageCode: createDraft.languageCode,
      categoryCode: createDraft.categoryCode,
      adminNote: createDraft.adminNote.trim() || null,
      grantAccess: createDraft.grantAccess
        ? {
            accessDays: createDraft.isLifetime ? null : createDraft.accessDays,
            isLifetime: createDraft.isLifetime,
            reason: createDraft.reason.trim() || null,
          }
        : null,
    };
    const created = await api.adminCreateUser(payload);
    setSelected(created);
    setCreateDraft(emptyCreate);
    setShowCreate(false);
    await loadUsers(1);
  }

  async function refreshSelected() {
    if (!selected) return;
    setSelected(await api.adminUser(selected.id));
    await loadUsers();
  }

  async function toggleBlock() {
    if (!selected) return;
    await api.adminBlockUser(selected.id, !selected.isBlocked, selected.adminNote ?? null);
    await refreshSelected();
  }

  async function restoreUser() {
    if (!selected) return;
    await api.adminRestoreUser(selected.id);
    await refreshSelected();
  }

  async function softDeleteUser() {
    if (!selected) return;
    await api.adminDeleteUser(selected.id);
    await refreshSelected();
  }

  async function permanentDelete() {
    if (!selected || confirmPhrase !== "PERMANENTLY_DELETE") return;
    await api.adminDeleteUserPermanent(selected.id);
    setSelected(null);
    await loadUsers();
  }

  const totalPages = users?.totalPages ?? 1;
  const total = users?.total ?? 0;

  return (
    <div className="admin-stack">
      <AdminCard
        title={t("users.title")}
        actions={<AdminButton variant="primary" type="button" onClick={() => setShowCreate(true)}><UserPlus size={16} />{t("users.addUser")}</AdminButton>}
      >
        <div className="admin-toolbar">
          <Input
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder={t("users.searchPlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") updateParams({ q: queryDraft, page: 1 });
            }}
          />
          <AdminButton variant="primary" type="button" onClick={() => updateParams({ q: queryDraft, page: 1 })}>{t("common.search")}</AdminButton>
          <Checkbox checked={includeDeleted} onChange={(value) => updateParams({ includeDeleted: value, page: 1 })} label={t("users.showDeleted")} />
        </div>

        {loading ? <div className="admin-skeleton-list"><span /><span /><span /></div> : null}
        {!loading && users?.items.length === 0 ? (
          <div className="admin-empty"><UserPlus size={24} /><p>{t("users.empty")}</p><AdminButton variant="primary" type="button" onClick={() => setShowCreate(true)}>{t("users.addUser")}</AdminButton></div>
        ) : null}
        <div className="admin-user-grid">
          {(users?.items ?? []).map((user) => (
            <button className="admin-user-card" type="button" key={user.id} onClick={() => void openUser(user.id)}>
              <Avatar user={user} />
              <div>
                <strong>{displayName(user)}</strong>
                <p>{user.username ? `@${user.username}` : user.telegramId}</p>
                <small>{t("users.registered")} {formatDate(user.createdAt)}</small>
              </div>
              <div className="admin-card-badges">
                <span className={`admin-status ${statusClass(user)}`}>{statusLabel(user, t)}</span>
                {user.isAdmin ? <span className="admin-badge"><Shield size={12} />{t("users.admin")}</span> : null}
              </div>
            </button>
          ))}
        </div>

        <div className="admin-pagination">
          <AdminButton variant="secondary" type="button" disabled={page <= 1} onClick={() => updateParams({ page: Math.max(1, page - 1) })}>
            <ChevronLeft size={16} />{t("common.prev")}
          </AdminButton>
          <span>{t("users.pageSummary", { page, totalPages, total })}</span>
          <AdminButton variant="secondary" type="button" disabled={page >= totalPages} onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}>
            {t("common.next")}<ChevronRight size={16} />
          </AdminButton>
        </div>
      </AdminCard>

      {showCreate ? (
        <div className="admin-overlay" role="presentation" onClick={() => setShowCreate(false)}>
          <form className="admin-panel" onSubmit={createUser} onClick={(event) => event.stopPropagation()}>
            <header><h2>{t("users.create.title")}</h2><AdminButton type="button" onClick={() => setShowCreate(false)}>{t("common.cancel")}</AdminButton></header>
            <Input label={t("users.create.telegramId")} required value={createDraft.telegramId} onChange={(event) => setCreateDraft({ ...createDraft, telegramId: event.target.value })} />
            <div className="admin-grid admin-grid--2">
              <Input label={t("users.create.username")} hint={t("users.create.usernameHint")} value={createDraft.username} onChange={(event) => setCreateDraft({ ...createDraft, username: event.target.value })} />
              <Input label={t("users.create.firstName")} value={createDraft.firstName} onChange={(event) => setCreateDraft({ ...createDraft, firstName: event.target.value })} />
            </div>
            <Input label={t("users.create.lastName")} value={createDraft.lastName} onChange={(event) => setCreateDraft({ ...createDraft, lastName: event.target.value })} />
            <div className="admin-grid admin-grid--2">
              <Select label={t("users.create.language")} value={createDraft.languageCode} onChange={(value) => setCreateDraft({ ...createDraft, languageCode: value })} options={languages.map((language) => ({ value: language.code, label: `${language.code.toUpperCase()} · ${language.name}` }))} />
              <Select label={t("users.create.category")} value={createDraft.categoryCode} onChange={(value) => setCreateDraft({ ...createDraft, categoryCode: value })} options={categories.map((category) => ({ value: category.code, label: `${category.code} · ${category.name}` }))} />
            </div>
            <Textarea label={t("users.create.adminNote")} value={createDraft.adminNote} onChange={(event) => setCreateDraft({ ...createDraft, adminNote: event.target.value })} />
            <Checkbox checked={createDraft.grantAccess} onChange={(value) => setCreateDraft({ ...createDraft, grantAccess: value })} label={t("users.create.grantAccess")} />
            {createDraft.grantAccess ? (
              <>
                <ToggleLine checked={createDraft.isLifetime} onChange={(value) => setCreateDraft({ ...createDraft, isLifetime: value })} label={t("users.create.lifetime")} />
                {!createDraft.isLifetime ? <Input label={t("users.create.accessDays")} type="number" min={1} value={createDraft.accessDays} onChange={(event) => setCreateDraft({ ...createDraft, accessDays: Number(event.target.value) })} /> : null}
                <Input label={t("users.create.reason")} value={createDraft.reason} onChange={(event) => setCreateDraft({ ...createDraft, reason: event.target.value })} />
              </>
            ) : null}
            <AdminButton variant="primary" type="submit">{t("common.create")}</AdminButton>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="admin-overlay" role="presentation" onClick={() => setSelected(null)}>
          <aside className="admin-panel admin-panel--wide" onClick={(event) => event.stopPropagation()}>
            <header><h2>{displayName(selected)}</h2><AdminButton type="button" onClick={() => setSelected(null)}>{t("common.cancel")}</AdminButton></header>
            <div className="admin-user-detail">
              {Object.entries(selected).filter(([_, value]) => typeof value !== "object" || value === null).map(([key, value]) => (
                <div key={key}><span>{key}</span><strong>{String(value ?? "—")}</strong></div>
              ))}
            </div>
            <div className="admin-actions">
              <AdminButton variant="secondary" type="button" onClick={() => void toggleBlock()}>{selected.isBlocked ? t("users.unblock") : t("users.block")}</AdminButton>
              {selected.deletedAt ? <AdminButton variant="primary" type="button" onClick={() => void restoreUser()}>{t("users.restoreUser")}</AdminButton> : <AdminButton variant="danger" type="button" onClick={() => void softDeleteUser()}>{t("users.deleteUser")}</AdminButton>}
            </div>
            <Section title={t("users.paymentHistory")}>
              {selected.paymentOrders.map((order) => <p key={order.id}>{order.status} · {order.amountStarsFinal} ⭐ · {order.product?.title ?? "Product"}</p>)}
            </Section>
            <Section title={t("users.accessHistory")}>
              {selected.userAccesses.map((access) => <p key={access.id}>{access.source} · {access.isLifetime ? t("users.create.lifetime") : access.expiresAt ? formatDate(access.expiresAt) : "—"}</p>)}
            </Section>
            <Section title={t("users.dangerZone")}>
              <Input value={confirmPhrase} onChange={(event) => setConfirmPhrase(event.target.value)} placeholder="PERMANENTLY_DELETE" />
              <AdminButton variant="danger" type="button" disabled={confirmPhrase !== "PERMANENTLY_DELETE"} onClick={() => void permanentDelete()}>{t("users.permanentDelete")}</AdminButton>
            </Section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ToggleLine({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return <Checkbox checked={checked} onChange={onChange} label={label} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="admin-detail-section"><h3>{title}</h3><div>{children}</div></section>;
}

function Avatar({ user }: { user: UserRecord }) {
  const label = initials(user);
  return <span className="admin-avatar" style={{ backgroundColor: avatarColor(displayName(user)) }}>{label}</span>;
}

function initials(user: UserRecord) {
  const text = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.telegramId;
  return text.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function avatarColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 58% 42%)`;
}

function displayName(user: UserRecord) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.telegramId;
}

function statusClass(user: UserRecord) {
  if (user.deletedAt) return "is-danger";
  if (user.isBlocked) return "is-warning";
  return "is-success";
}

function statusLabel(user: UserRecord, t: (key: string) => string) {
  if (user.deletedAt) return t("users.status.deleted");
  if (user.isBlocked) return t("users.status.blocked");
  return t("users.status.active");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
