import { useEffect, useState, type FormEvent } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api, type Banner, type BannerInput, type NewsInput, type NewsItem, type PaymentOrder, type Product, type ProductInput, type PromoCode, type PromoCodeInput, type Promotion, type PromotionInput, type UserDetail, type UserRecord } from "../lib/api";

function toLocalDateTime(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function fromLocalDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function jsonish(value: unknown) {
  return JSON.stringify(value, null, 2);
}

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
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [grant, setGrant] = useState({ accessDays: 7, isLifetime: false, reason: "", internalNote: "", productId: "" });
  const [adminNote, setAdminNote] = useState("");
  useEffect(() => { if (isAdmin) api.adminUsers().then(setUsers); }, [isAdmin]);
  if (!isAdmin) return <AdminDenied />;
  async function search() { setUsers(await api.adminUsers(query)); }
  async function loadUser(id: string) {
    const user = await api.adminUser(id);
    setSelected(user);
    setAdminNote(user.adminNote ?? "");
  }
  return (
    <section className="admin-page">
      <h2>Users</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Telegram ID, username, first or last name" />
        <button className="button button--primary" onClick={search}>Search</button>
      </div>
      <div className="row-list">
        {users.map((user) => (
          <button className="question-row" key={user.id} onClick={() => void loadUser(user.id)} type="button">
            <div>
              <span className="tag">{user.telegramId}</span>
              <strong>{user.firstName ?? user.username ?? "Unknown"}</strong>
              <small>{user.username ?? "no username"}</small>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <section className="menu-list">
          <div className="question-row">
            <div>
              <span className="tag">Selected user</span>
              <strong>{selected.firstName ?? selected.username ?? selected.telegramId}</strong>
              <small>{selected.isBlocked ? "Blocked" : "Active"}</small>
              <small>{selected.adminNote ?? "No note"}</small>
            </div>
            <button className="button button--muted" onClick={async () => { await api.adminBlockUser(selected.id, !selected.isBlocked, adminNote); setSelected(await api.adminUser(selected.id)); }}>Toggle block</button>
          </div>
          <div style={{ display: "grid", gap: 8, padding: "12px 0" }}>
            <input type="number" value={grant.accessDays} onChange={(e) => setGrant({ ...grant, accessDays: Number(e.target.value) })} placeholder="accessDays" />
            <label><input type="checkbox" checked={grant.isLifetime} onChange={(e) => setGrant({ ...grant, isLifetime: e.target.checked })} /> Lifetime</label>
            <input value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} placeholder="Reason" />
            <input value={grant.internalNote} onChange={(e) => setGrant({ ...grant, internalNote: e.target.value })} placeholder="Internal note" />
            <input value={grant.productId} onChange={(e) => setGrant({ ...grant, productId: e.target.value })} placeholder="Product ID (optional)" />
            <button className="button button--primary" onClick={async () => { await api.adminGrantAccess(selected.id, grant); setSelected(await api.adminUser(selected.id)); }}>Grant access</button>
            <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Admin note" />
            <button className="button button--muted" onClick={async () => { await api.adminBlockUser(selected.id, selected.isBlocked, adminNote); setSelected(await api.adminUser(selected.id)); }}>Save note</button>
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
                <button className="button button--muted" onClick={async () => { await api.adminRevokeAccess(selected.id, { accessId: access.id }); setSelected(await api.adminUser(selected.id)); }}>Revoke</button>
              </div>
            ))}
          </div>
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
