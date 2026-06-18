import { useEffect, useState, type FormEvent } from "react";
import { Navigate, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ApiError, api, type AdminUsersResponse, type Banner, type BannerInput, type Category, type CreateUserInput, type Language, type NewsInput, type NewsItem, type PaymentOrder, type Product, type ProductInput, type PromoCode, type PromoCodeInput, type Promotion, type PromotionInput, type UserDetail } from "../lib/api";

function toLocalDateTime(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function fromLocalDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function jsonish(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

type UserCreateDraft = {
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  categoryCode: string;
  adminNote: string;
  grantAccessEnabled: boolean;
  grantAccessMode: "days" | "lifetime";
  accessDays: number;
  reason: string;
};

const emptyUserCreateDraft: UserCreateDraft = {
  telegramId: "",
  username: "",
  firstName: "",
  lastName: "",
  languageCode: "en",
  categoryCode: "B",
  adminNote: "",
  grantAccessEnabled: false,
  grantAccessMode: "days",
  accessDays: 30,
  reason: "",
};

function AdminDenied() {
  const { t, isAdmin } = useApp();
  if (isAdmin) return null;
  return (
    <section className="empty-state">
      <p>{t("admin.accessDenied")}</p>
    </section>
  );
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin(username.trim(), password);
      window.location.href = "/admin";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-page">
      <p className="eyebrow">Admin</p>
      <h1>Login</h1>
      <p className="page-intro">Use your admin username and password to open the control panel.</p>
      <form className="card-grid" onSubmit={submit}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error ? <div className="feedback feedback--wrong"><strong>{error}</strong></div> : null}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="button button--primary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          <button className="button button--muted" type="button" onClick={() => navigate("/")}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

export function AdminLayout() {
  const { isAdmin } = useApp();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <p className="eyebrow">Admin</p>
          <h1>Alman Drive</h1>
          <p className="page-intro">Manage products, access, banners, promotions, and news.</p>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/promo-codes">Promo codes</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/banners">Banners</NavLink>
          <NavLink to="/admin/promotions">Promotions</NavLink>
          <NavLink to="/admin/news">News</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </section>
  );
}

export function AdminDashboardPage() {
  const { isAdmin } = useApp();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminDashboard>> | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    api.adminDashboard().then(setData).catch(() => setData(null));
  }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  if (!data) return <div className="loading">Loading admin dashboard…</div>;
  return (
    <section className="admin-page">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Overview</h2>
          <p className="page-intro">A quick snapshot of users, revenue, orders, and content health.</p>
        </div>
      </header>
      <div className="stat-grid admin-stat-grid">
        <div><strong>{data.totalUsers}</strong><span>Total users</span></div>
        <div><strong>{data.activeSubscribers}</strong><span>Active subscribers</span></div>
        <div><strong>{data.revenueStars}</strong><span>Revenue Stars</span></div>
        <div><strong>{data.ordersToday}</strong><span>Orders today</span></div>
        <div><strong>{data.ordersMonth}</strong><span>Orders this month</span></div>
        <div><strong>{data.activePromoCodes}</strong><span>Active promo codes</span></div>
        <div><strong>{data.activeBanners}</strong><span>Active banners</span></div>
        <div><strong>{data.adminTelegramIds.length}</strong><span>Admin IDs</span></div>
      </div>
      <section className="card-grid">
        <article className="card admin-card" style={{ gridColumn: "1 / -1" }}>
          <h3>Recent orders</h3>
          <div className="row-list">
            {data.recentOrders.map((order) => (
              <div className="exam-row" key={order.id}>
                <span className="tag">{order.status}</span>
                <strong>{order.amountStarsFinal} ⭐</strong>
                <small>{order.product?.title ?? "Product"}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function ProductEditor({ initial, onSubmit, onCancel }: {
  initial: ProductInput;
  onSubmit(value: ProductInput): Promise<void>;
  onCancel(): void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);
  return (
    <form className="selection-list" onSubmit={(event) => { event.preventDefault(); void onSubmit(draft); }}>
      {(["title", "description", "priceStars", "accessDays", "isLifetime", "isActive", "sortOrder", "badgeText", "oldPriceStars"] as const).map((field) => (
        <label key={field} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
          <span>{field}</span>
          {field === "description" || field === "badgeText" ? (
            <textarea value={(draft[field] as string | null) ?? ""} onChange={(e) => setDraft({ ...draft, [field]: e.target.value || null })} />
          ) : field === "isLifetime" || field === "isActive" ? (
            <input type="checkbox" checked={Boolean(draft[field])} onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })} />
          ) : (
            <input
              type={field === "priceStars" || field === "accessDays" || field === "sortOrder" || field === "oldPriceStars" ? "number" : "text"}
              value={String(draft[field] ?? "")}
              onChange={(e) => setDraft({ ...draft, [field]: field === "priceStars" || field === "accessDays" || field === "sortOrder" || field === "oldPriceStars"
                ? Number(e.target.value)
                : e.target.value })}
            />
          )}
        </label>
      ))}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="button button--primary" type="submit">Save</button>
        <button className="button button--muted" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function AdminProductsPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const empty: ProductInput = { title: "", description: "", priceStars: 25, accessDays: 1, isLifetime: false, isActive: true, sortOrder: 0, badgeText: "", oldPriceStars: null };
  const [draft, setDraft] = useState<ProductInput>(empty);
  useEffect(() => { if (isAdmin) api.adminProducts().then(setItems); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function save(value: ProductInput) {
    const payload = { ...value, description: value.description || null, badgeText: value.badgeText || null, oldPriceStars: value.oldPriceStars ?? null };
    if (editing) await api.adminUpdateProduct(editing, payload);
    else await api.adminCreateProduct(payload);
    setItems(await api.adminProducts());
    setEditing(null);
    setDraft(empty);
  }
  return (
    <section className="admin-page">
      <h2>Products</h2>
      <ProductEditor initial={draft} onSubmit={save} onCancel={() => { setEditing(null); setDraft(empty); }} />
      <div className="row-list">
        {items.map((item) => (
          <div className="question-row" key={item.id}>
            <div>
              <span className="tag">{item.isActive ? "active" : "inactive"}</span>
              <strong>{item.title} · {item.priceStars} ⭐</strong>
              <small>{item.description ?? "No description"}</small>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button button--muted" onClick={() => { setEditing(item.id); setDraft({
                title: item.title,
                description: item.description ?? "",
                priceStars: item.priceStars,
                accessDays: item.accessDays ?? 1,
                isLifetime: item.isLifetime,
                isActive: item.isActive,
                sortOrder: item.sortOrder,
                badgeText: item.badgeText ?? "",
                oldPriceStars: item.oldPriceStars,
              }); }}>Edit</button>
              <button className="button button--muted" onClick={async () => { await api.adminDeleteProduct(item.id); setItems(await api.adminProducts()); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminPromoCodesPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<PromoCode[]>([]);
  const empty: PromoCodeInput = { code: "", type: "FREE_ACCESS", discountPercent: null, discountStars: null, accessDays: 1, isLifetime: false, maxUses: null, maxUsesPerUser: null, validFrom: null, validUntil: null, isActive: true, sortOrder: 0 };
  const [draft, setDraft] = useState<PromoCodeInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { if (isAdmin) api.adminPromoCodes().then(setItems); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function save() {
    const payload = {
      ...draft,
      code: draft.code.toUpperCase(),
      validFrom: draft.validFrom || null,
      validUntil: draft.validUntil || null,
    };
    if (editing) await api.adminUpdatePromoCode(editing, payload);
    else await api.adminCreatePromoCode(payload);
    setItems(await api.adminPromoCodes());
    setEditing(null);
    setDraft(empty);
  }
  return (
    <section className="admin-page">
      <h2>Promo codes</h2>
      <div className="selection-list">
        {(["code", "type", "discountPercent", "discountStars", "accessDays", "isLifetime", "maxUses", "maxUsesPerUser", "validFrom", "validUntil", "isActive", "sortOrder"] as const).map((field) => (
          <label key={field} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
            <span>{field}</span>
            {field === "isLifetime" || field === "isActive" ? (
              <input type="checkbox" checked={Boolean(draft[field])} onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })} />
            ) : field === "type" ? (
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PromoCodeInput["type"] })}>
                <option value="FREE_ACCESS">FREE_ACCESS</option>
                <option value="PERCENT_DISCOUNT">PERCENT_DISCOUNT</option>
                <option value="FIXED_STARS_DISCOUNT">FIXED_STARS_DISCOUNT</option>
              </select>
            ) : field === "validFrom" || field === "validUntil" ? (
              <input type="datetime-local" value={toLocalDateTime(draft[field])} onChange={(e) => setDraft({ ...draft, [field]: fromLocalDateTime(e.target.value) })} />
            ) : (
              <input type={field === "discountPercent" || field === "discountStars" || field === "accessDays" || field === "maxUses" || field === "maxUsesPerUser" || field === "sortOrder" ? "number" : "text"} value={String(draft[field] ?? "")} onChange={(e) => setDraft({ ...draft, [field]: field === "discountPercent" || field === "discountStars" || field === "accessDays" || field === "maxUses" || field === "maxUsesPerUser" || field === "sortOrder" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })} />
            )}
          </label>
        ))}
        <button className="button button--primary" onClick={save}>Save</button>
      </div>
      <div className="row-list">
        {items.map((item) => (
          <div className="question-row" key={item.id}>
            <div>
              <span className="tag">{item.type}</span>
              <strong>{item.code}</strong>
              <small>{item.usages?.length ?? 0} uses</small>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button button--muted" onClick={() => {
                setEditing(item.id);
                setDraft({
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
                });
              }}>Edit</button>
              <button className="button button--muted" onClick={async () => { await api.adminDeletePromoCode(item.id); setItems(await api.adminPromoCodes()); }}>Deactivate</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminUsersPage() {
  const { isAdmin } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [loadingList, setLoadingList] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<UserCreateDraft>(emptyUserCreateDraft);
  const [grant, setGrant] = useState({ accessDays: 30, isLifetime: false, reason: "", internalNote: "", productId: "" });
  const [adminNote, setAdminNote] = useState("");

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const query = searchParams.get("q") ?? "";

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

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
    setLoadingList(true);
    try {
      const response = await api.adminUsers({
        q: query || undefined,
        page: nextPage,
        limit: 50,
        includeDeleted,
      });
      setUsers(response);
      return response;
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [isAdmin, query, page, includeDeleted]);

  if (!isAdmin) return <AdminDenied />;

  async function loadUser(id: string) {
    const user = await api.adminUser(id);
    setSelected(user);
    setAdminNote(user.adminNote ?? "");
    return user;
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateUserInput = {
      telegramId: createDraft.telegramId,
      username: createDraft.username.trim() || null,
      firstName: createDraft.firstName.trim() || null,
      lastName: createDraft.lastName.trim() || null,
      languageCode: createDraft.languageCode,
      categoryCode: createDraft.categoryCode,
      adminNote: createDraft.adminNote.trim() || null,
      grantAccess: createDraft.grantAccessEnabled
        ? {
            accessDays: createDraft.grantAccessMode === "days" ? createDraft.accessDays : null,
            isLifetime: createDraft.grantAccessMode === "lifetime",
            reason: createDraft.reason.trim() || null,
          }
        : null,
    };
    try {
      const created = await api.adminCreateUser(payload);
      setSelected(created);
      setAdminNote(created.adminNote ?? "");
      setCreateDraft(emptyUserCreateDraft);
      setCreateOpen(false);
      await loadUsers(1);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          const data = error.data as { existingUserId?: string; isDeleted?: boolean } | undefined;
          const duplicateId = payload.telegramId;
          if (data?.isDeleted && data.existingUserId) {
            const shouldRestore = window.confirm(`User with Telegram ID ${duplicateId} already exists. They are soft-deleted, would you like to restore them?`);
            if (shouldRestore) {
              const restored = await api.adminRestoreUser(data.existingUserId);
              await loadUsers(1);
              await loadUser(restored.user.id);
            }
          } else {
            alert(`User with Telegram ID ${duplicateId} already exists.`);
          }
          return;
        }
        alert(error.message);
        return;
      }
      alert(error instanceof Error ? error.message : "Failed to create user.");
    }
  }

  async function refreshSelected(userId: string) {
    const user = await loadUser(userId);
    setSelected(user);
    return user;
  }

  async function handleToggleDelete() {
    if (!selected) return;
    if (!selected.deletedAt) {
      if (!window.confirm("Delete this user? They will be hidden but order history is preserved. You can restore them later.")) return;
      await api.adminDeleteUser(selected.id);
      await refreshSelected(selected.id);
      await loadUsers();
      return;
    }
    if (!window.confirm("Restore this user? Previous accesses will NOT be restored automatically.")) return;
    await api.adminRestoreUser(selected.id);
    await refreshSelected(selected.id);
    await loadUsers();
  }

  async function handleHardDelete() {
    if (!selected) return;
    if (!window.confirm("PERMANENTLY delete this user? This cannot be undone.")) return;
    const phrase = window.prompt("Type PERMANENTLY_DELETE to confirm:");
    if (phrase !== "PERMANENTLY_DELETE") return;
    try {
      await api.adminDeleteUserPermanent(selected.id);
      setSelected(null);
      await loadUsers();
    } catch (error) {
      if (error instanceof Error && (error as { status?: number }).status === 409) {
        alert("Cannot permanently delete: user has paid orders. Use soft delete only.");
        return;
      }
      alert(error instanceof Error ? error.message : "Failed to permanently delete user.");
    }
  }

  async function handleGrantAccess() {
    if (!selected) return;
    await api.adminGrantAccess(selected.id, grant);
    await refreshSelected(selected.id);
  }

  async function handleBlockToggle() {
    if (!selected) return;
    await api.adminBlockUser(selected.id, !selected.isBlocked, adminNote);
    await refreshSelected(selected.id);
  }

  async function handleSaveNote() {
    if (!selected) return;
    await api.adminBlockUser(selected.id, selected.isBlocked, adminNote);
    await refreshSelected(selected.id);
  }

  const totalPages = users?.totalPages ?? 1;
  const total = users?.total ?? 0;

  function updateSearchParams(next: { q?: string; page?: number; includeDeleted?: boolean }) {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.page !== undefined) params.set("page", String(next.page));
    if (next.includeDeleted !== undefined) {
      if (next.includeDeleted) params.set("includeDeleted", "true");
      else params.delete("includeDeleted");
    }
    setSearchParams(params);
  }

  return (
    <section className="admin-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2>Users</h2>
        <button className="button button--primary" type="button" onClick={() => setCreateOpen((value) => !value)}>
          Add user
        </button>
      </div>

      {createOpen && (
        <form className="card" onSubmit={submitCreate} style={{ marginBottom: 16, gap: 12, display: "grid" }}>
          <h3>Add user</h3>
          <div className="card-grid">
            <label style={{ display: "grid", gap: 6 }}>
              <span>Telegram ID</span>
              <input type="number" value={createDraft.telegramId} onChange={(e) => setCreateDraft({ ...createDraft, telegramId: e.target.value })} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Username</span>
              <input value={createDraft.username} onChange={(e) => setCreateDraft({ ...createDraft, username: e.target.value })} placeholder="without @" />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>First name</span>
              <input value={createDraft.firstName} onChange={(e) => setCreateDraft({ ...createDraft, firstName: e.target.value })} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Last name</span>
              <input value={createDraft.lastName} onChange={(e) => setCreateDraft({ ...createDraft, lastName: e.target.value })} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Language</span>
              <select value={createDraft.languageCode} onChange={(e) => setCreateDraft({ ...createDraft, languageCode: e.target.value })}>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>{language.code} · {language.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select value={createDraft.categoryCode} onChange={(e) => setCreateDraft({ ...createDraft, categoryCode: e.target.value })}>
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>{category.code} · {category.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span>Admin note</span>
              <textarea value={createDraft.adminNote} onChange={(e) => setCreateDraft({ ...createDraft, adminNote: e.target.value })} />
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={createDraft.grantAccessEnabled} onChange={(e) => setCreateDraft({ ...createDraft, grantAccessEnabled: e.target.checked })} />
            Grant access immediately
          </label>
          {createDraft.grantAccessEnabled && (
            <div className="card-grid">
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    checked={createDraft.grantAccessMode === "days"}
                    onChange={() => setCreateDraft({ ...createDraft, grantAccessMode: "days" })}
                  />
                  By days
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    checked={createDraft.grantAccessMode === "lifetime"}
                    onChange={() => setCreateDraft({ ...createDraft, grantAccessMode: "lifetime" })}
                  />
                  Lifetime
                </label>
              </div>
              {createDraft.grantAccessMode === "days" ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Access days</span>
                  <input type="number" min={1} value={createDraft.accessDays} onChange={(e) => setCreateDraft({ ...createDraft, accessDays: Number(e.target.value) })} />
                </label>
              ) : null}
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                <span>Reason</span>
                <input value={createDraft.reason} onChange={(e) => setCreateDraft({ ...createDraft, reason: e.target.value })} />
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button button--primary" type="submit">Create</button>
            <button className="button button--muted" type="button" onClick={() => { setCreateOpen(false); setCreateDraft(emptyUserCreateDraft); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by Telegram ID, username, first or last name"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              updateSearchParams({ q: searchInput, page: 1 });
            }
          }}
        />
        <button className="button button--primary" type="button" onClick={() => updateSearchParams({ q: searchInput, page: 1 })}>
          Search
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => updateSearchParams({ includeDeleted: e.target.checked, page: 1 })}
          />
          Show deleted
        </label>
      </div>

      <div className="row-list">
        {loadingList ? (
          <div className="loading">Loading users…</div>
        ) : (
          users?.items.map((user) => (
            <button
              className="question-row"
              key={user.id}
              onClick={() => void loadUser(user.id)}
              type="button"
              style={{ opacity: user.deletedAt ? 0.5 : 1 }}
            >
              <div>
                <span className="tag">{user.deletedAt ? "Deleted" : user.telegramId}</span>
                <strong>{user.firstName ?? user.username ?? "Unknown"}</strong>
                <small>{user.username ?? "no username"}</small>
                {user.deletedAt ? <small>Deleted</small> : null}
              </div>
            </button>
          ))
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          className="button button--muted"
          type="button"
          onClick={() => updateSearchParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
        >
          ← Prev
        </button>
        <span>{`Page ${page} of ${totalPages} · ${total} users`}</span>
        <button
          className="button button--muted"
          type="button"
          onClick={() => updateSearchParams({ page: Math.min(totalPages, page + 1) })}
          disabled={page >= totalPages}
        >
          Next →
        </button>
      </div>

      {selected && (
        <section className="menu-list" style={{ marginTop: 20 }}>
          <div className="question-row">
            <div>
              <span className="tag">Selected user</span>
              <strong>{selected.firstName ?? selected.username ?? selected.telegramId}</strong>
              <small>{selected.isBlocked ? "Blocked" : "Active"}</small>
              <small>{selected.adminNote ?? "No note"}</small>
              {selected.deletedAt ? <small>{`Deleted on ${formatDateTime(selected.deletedAt)}`}</small> : null}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <button className="button button--muted" type="button" onClick={handleBlockToggle}>
                Toggle block
              </button>
              <button className="button button--muted" type="button" onClick={handleSaveNote}>
                Save note
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, padding: "12px 0" }}>
            <input type="number" value={grant.accessDays} onChange={(e) => setGrant({ ...grant, accessDays: Number(e.target.value) })} placeholder="accessDays" />
            <label><input type="checkbox" checked={grant.isLifetime} onChange={(e) => setGrant({ ...grant, isLifetime: e.target.checked })} /> Lifetime</label>
            <input value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} placeholder="Reason" />
            <input value={grant.internalNote} onChange={(e) => setGrant({ ...grant, internalNote: e.target.value })} placeholder="Internal note" />
            <input value={grant.productId} onChange={(e) => setGrant({ ...grant, productId: e.target.value })} placeholder="Product ID (optional)" />
            <button className="button button--primary" onClick={handleGrantAccess}>Grant access</button>
          </div>

          <div className="row-list">
            <div className="question-row">
              <div>
                <span className="tag">Payment history</span>
                {selected.paymentOrders.map((order) => (
                  <small key={order.id}>{order.status} · {order.amountStarsFinal} ⭐ · {order.product?.title ?? "Product"}</small>
                ))}
              </div>
            </div>
            <div className="question-row">
              <div>
                <span className="tag">Promo usage</span>
                {selected.promoCodeUsages.map((usage) => (
                  <small key={usage.id}>{usage.promoCode.code} · {usage.discountStarsApplied} ⭐</small>
                ))}
              </div>
            </div>
            {selected.userAccesses.map((access) => (
              <div className="question-row" key={access.id}>
                <div>
                  <span className="tag">{access.source}</span>
                  <strong>{access.isLifetime ? "Lifetime" : access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : "No expiry"}</strong>
                </div>
                <button className="button button--muted" onClick={async () => { await api.adminRevokeAccess(selected.id, { accessId: access.id }); await refreshSelected(selected.id); }}>Revoke</button>
              </div>
            ))}
          </div>

          <section
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(148, 163, 184, 0.25)",
              background: selected.deletedAt ? "rgba(220, 38, 38, 0.05)" : "transparent",
            }}
          >
            <h3>Danger zone</h3>
            {!selected.deletedAt ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="button button--muted" type="button" style={{ borderColor: "rgba(239, 68, 68, 0.35)", color: "#b91c1c" }} onClick={handleToggleDelete}>
                  Delete user
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <span className="tag">{`Deleted on ${formatDateTime(selected.deletedAt)}`}</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="button button--muted" type="button" onClick={handleToggleDelete}>
                    Restore
                  </button>
                  <button className="button button--muted" type="button" style={{ borderColor: "rgba(220, 38, 38, 0.55)", color: "#b91c1c" }} onClick={handleHardDelete}>
                    Permanently delete
                  </button>
                </div>
              </div>
            )}
          </section>
        </section>
      )}
    </section>
  );
}

export function AdminOrdersPage() {
  const { isAdmin } = useApp();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [filters, setFilters] = useState({ status: "", userId: "", from: "", to: "" });
  useEffect(() => { if (isAdmin) api.adminOrders().then(setOrders); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function search() { setOrders(await api.adminOrders(filters)); }
  return (
    <section className="admin-page">
      <h2>Orders</h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {(["status", "userId", "from", "to"] as const).map((field) => (
          <input key={field} value={filters[field]} onChange={(e) => setFilters({ ...filters, [field]: e.target.value })} placeholder={field} />
        ))}
        <button className="button button--primary" onClick={search}>Filter</button>
      </div>
      <div className="row-list">
        {orders.map((order) => (
          <div className="question-row" key={order.id}>
            <div>
              <span className="tag">{order.status}</span>
              <strong>{order.amountStarsFinal} ⭐ · {order.product?.title ?? "Product"}</strong>
              <small>{order.promoCode?.code ?? "No promo"}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminBannersPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<Banner[]>([]);
  const empty: BannerInput = { imageUrl: null, title: "", subtitle: "", buttonText: "", buttonUrl: "", placement: "HOME_TOP", languageCode: "all", isActive: true, sortOrder: 0, validFrom: null, validUntil: null };
  const [draft, setDraft] = useState<BannerInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { if (isAdmin) api.adminBanners().then(setItems); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function save() {
    const payload = {
      ...draft,
      subtitle: draft.subtitle || null,
      buttonText: draft.buttonText || null,
      buttonUrl: draft.buttonUrl || null,
      validFrom: draft.validFrom || null,
      validUntil: draft.validUntil || null,
      languageCode: draft.languageCode || null,
    };
    if (editing) await api.adminUpdateBanner(editing, payload);
    else await api.adminCreateBanner(payload);
    setItems(await api.adminBanners());
    setEditing(null);
    setDraft(empty);
  }
  return (
    <section className="admin-page">
      <h2>Banners</h2>
      <div className="selection-list">
        {(["title", "subtitle", "imageUrl", "buttonText", "buttonUrl", "placement", "languageCode", "isActive", "sortOrder"] as const).map((field) => (
          <label key={field} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
            <span>{field}</span>
            {field === "isActive" ? (
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            ) : field === "placement" ? (
              <select value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as BannerInput["placement"] })}>
                {["HOME_TOP", "HOME_MIDDLE", "PRICING_TOP", "QUIZ_BOTTOM", "LEARN_TOP"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : field === "sortOrder" ? (
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
            ) : (
              <input value={String(draft[field] ?? "")} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            )}
          </label>
        ))}
        <button className="button button--primary" onClick={save}>Save</button>
      </div>
      <div className="row-list">
        {items.map((item) => (
          <div className="question-row" key={item.id}>
            <div><strong>{item.title}</strong><small>{item.placement}</small></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button button--muted" onClick={() => { setEditing(item.id); setDraft({ imageUrl: item.imageUrl, title: item.title, subtitle: item.subtitle ?? "", buttonText: item.buttonText ?? "", buttonUrl: item.buttonUrl ?? "", placement: item.placement, languageCode: item.languageCode ?? "all", isActive: item.isActive, sortOrder: item.sortOrder, validFrom: item.validFrom, validUntil: item.validUntil }); }}>Edit</button>
              <button className="button button--muted" onClick={async () => { await api.adminDeleteBanner(item.id); setItems(await api.adminBanners()); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminPromotionsPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<Promotion[]>([]);
  const empty: PromotionInput = { imageUrl: null, title: "", description: "", buttonText: "", buttonUrl: "", linkedProductId: "", promoCodeId: "", languageCode: "all", isActive: true, validFrom: null, validUntil: null, sortOrder: 0 };
  const [draft, setDraft] = useState<PromotionInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { if (isAdmin) api.adminPromotions().then(setItems); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function save() {
    const payload = {
      ...draft,
      description: draft.description || null,
      buttonText: draft.buttonText || null,
      buttonUrl: draft.buttonUrl || null,
      linkedProductId: draft.linkedProductId || null,
      promoCodeId: draft.promoCodeId || null,
      validFrom: draft.validFrom || null,
      validUntil: draft.validUntil || null,
      languageCode: draft.languageCode || null,
    };
    if (editing) await api.adminUpdatePromotion(editing, payload);
    else await api.adminCreatePromotion(payload);
    setItems(await api.adminPromotions());
    setEditing(null);
    setDraft(empty);
  }
  return (
    <section className="admin-page">
      <h2>Promotions</h2>
      <div className="selection-list">
        {(["title", "description", "imageUrl", "buttonText", "buttonUrl", "linkedProductId", "promoCodeId", "languageCode", "isActive", "sortOrder"] as const).map((field) => (
          <label key={field} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
            <span>{field}</span>
            {field === "isActive" ? (
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            ) : field === "sortOrder" ? (
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
            ) : (
              <input value={String(draft[field] ?? "")} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            )}
          </label>
        ))}
        <button className="button button--primary" onClick={save}>Save</button>
      </div>
      <div className="row-list">
        {items.map((item) => (
          <div className="question-row" key={item.id}>
            <div><strong>{item.title}</strong><small>{item.languageCode ?? "all"}</small></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button button--muted" onClick={() => { setEditing(item.id); setDraft({ imageUrl: item.imageUrl, title: item.title, description: item.description ?? "", buttonText: item.buttonText ?? "", buttonUrl: item.buttonUrl ?? "", linkedProductId: item.linkedProductId ?? "", promoCodeId: item.promoCodeId ?? "", languageCode: item.languageCode ?? "all", isActive: item.isActive, validFrom: item.validFrom, validUntil: item.validUntil, sortOrder: item.sortOrder }); }}>Edit</button>
              <button className="button button--muted" onClick={async () => { await api.adminDeletePromotion(item.id); setItems(await api.adminPromotions()); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminNewsPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<NewsItem[]>([]);
  const empty: NewsInput = { title: "", excerpt: "", body: "", imageUrl: null, languageCode: "all", isPublished: false, publishedAt: null, sortOrder: 0 };
  const [draft, setDraft] = useState<NewsInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { if (isAdmin) api.adminNews().then(setItems); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function save() {
    const payload = {
      ...draft,
      excerpt: draft.excerpt || null,
      imageUrl: draft.imageUrl || null,
      languageCode: draft.languageCode || null,
      publishedAt: draft.publishedAt || null,
    };
    if (editing) await api.adminUpdateNews(editing, payload);
    else await api.adminCreateNews(payload);
    setItems(await api.adminNews());
    setEditing(null);
    setDraft(empty);
  }
  return (
    <section className="admin-page">
      <h2>News</h2>
      <div className="selection-list">
        {(["title", "excerpt", "body", "imageUrl", "languageCode", "isPublished", "publishedAt", "sortOrder"] as const).map((field) => (
          <label key={field} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
            <span>{field}</span>
            {field === "body" ? (
              <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            ) : field === "isPublished" ? (
              <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
            ) : field === "publishedAt" ? (
              <input type="datetime-local" value={toLocalDateTime(draft.publishedAt)} onChange={(e) => setDraft({ ...draft, publishedAt: fromLocalDateTime(e.target.value) })} />
            ) : field === "sortOrder" ? (
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
            ) : (
              <input value={String(draft[field] ?? "")} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            )}
          </label>
        ))}
        <button className="button button--primary" onClick={save}>Save</button>
      </div>
      <div className="row-list">
        {items.map((item) => (
          <div className="question-row" key={item.id}>
            <div><strong>{item.title}</strong><small>{item.isPublished ? "published" : "draft"}</small></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button button--muted" onClick={() => { setEditing(item.id); setDraft({ title: item.title, excerpt: item.excerpt ?? "", body: item.body, imageUrl: item.imageUrl, languageCode: item.languageCode ?? "all", isPublished: item.isPublished, publishedAt: item.publishedAt, sortOrder: item.sortOrder }); }}>Edit</button>
              <button className="button button--muted" onClick={async () => { await api.adminDeleteNews(item.id); setItems(await api.adminNews()); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminSettingsPage() {
  const { isAdmin } = useApp();
  const [settings, setSettings] = useState<{ adminTelegramIds: string[] } | null>(null);
  useEffect(() => { if (isAdmin) api.adminSettings().then(setSettings); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  return <section className="admin-page"><h2>Settings</h2><pre>{jsonish(settings ?? {})}</pre></section>;
}
