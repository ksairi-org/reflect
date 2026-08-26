// Authoritative Pro state from RevenueCat's V2 API. Shared by revenuecat-webhook
// and refresh-entitlement so the "is this customer Pro?" logic can't drift.
//
// Reads REVENUECAT_API_KEY (V2 secret) and REVENUECAT_PROJECT_ID from the
// function env.
const PRO_ENTITLEMENT = 'pro';

const rcFetch = (path: string, rcKey: string) =>
  fetch(`https://api.revenuecat.com/v2${path}`, {
    headers: { Authorization: `Bearer ${rcKey}` },
  });

// The /active_entitlements endpoint reports each grant by its INTERNAL id
// (e.g. "entla32e7d9c28"), NOT by the "pro" lookup key. So we resolve the id of
// the entitlement whose lookup_key is "pro" once (cached across warm invocations)
// and match against it. If that resolution ever fails transiently we fall back to
// "any active entitlement" — this app sells a single 'pro' entitlement, so any
// active grant is pro; the fallback keeps a paying user unblocked.
let proEntitlementId: string | null = null;

const resolveProEntitlementId = async (
  projectId: string,
  rcKey: string,
): Promise<string | null> => {
  if (proEntitlementId) return proEntitlementId;
  try {
    const res = await rcFetch(`/projects/${projectId}/entitlements`, rcKey);
    if (!res.ok) return null;
    const body = await res.json();
    const pro = (body.items ?? []).find(
      (e: { lookup_key?: string }) => e.lookup_key === PRO_ENTITLEMENT,
    ) as { id?: string } | undefined;
    proEntitlementId = pro?.id ?? null;
    return proEntitlementId;
  } catch {
    return null;
  }
};

// ISO 8601 product durations as RevenueCat reports them, mapped to the names the
// admin console and any human reading api.entitlements will actually use.
const PERIOD_BY_DURATION: Record<string, string> = {
  P1W: 'weekly',
  P2W: 'two_week',
  P1M: 'monthly',
  P2M: 'two_month',
  P3M: 'three_month',
  P6M: 'six_month',
  P1Y: 'annual',
  lifetime: 'lifetime',
};

// auto_renewal_status values that mean the subscription STOPS at the end of the
// current period. Anything else — will_renew, will_change_product,
// has_already_renewed, requires_price_increase_consent — continues, so we treat
// the set of stopping states as the closed one. A status RevenueCat adds later
// therefore reads as "renewing" rather than silently marking a paying user as
// churning.
const NOT_RENEWING = new Set(['will_not_renew', 'will_pause']);

export type ProPlan = {
  productId: string | null;
  periodType: string | null;
  store: string | null;
  autoRenew: boolean | null;
};

const NO_PLAN: ProPlan = { productId: null, periodType: null, store: null, autoRenew: null };

export type ProState = {
  isPro: boolean;
  expiresAt: string | null;
  // null ONLY when the plan lookup itself failed. Callers must then omit the plan
  // columns from their upsert so a transient RevenueCat hiccup cannot blank out
  // plan data that is already correct. NO_PLAN (all fields null) is different: it
  // is a definite "this customer has no active subscription", and is written.
  plan: ProPlan | null;
};

// Product metadata is immutable for practical purposes (a store identifier and a
// billing duration), so cache it across warm invocations and skip the lookup.
type ProductMeta = { storeIdentifier: string | null; periodType: string | null };
const productCache = new Map<string, ProductMeta>();

const fetchProduct = async (
  projectId: string,
  rcKey: string,
  productId: string,
): Promise<ProductMeta | null> => {
  const cached = productCache.get(productId);
  if (cached) return cached;
  try {
    const res = await rcFetch(`/projects/${projectId}/products/${productId}`, rcKey);
    if (!res.ok) return null;
    const body = await res.json();
    // A non-subscription product has no `subscription.duration`; it is a one-time
    // purchase, which for entitlement purposes is a lifetime grant.
    const duration: string | null = body?.subscription?.duration ?? (body?.one_time ? 'lifetime' : null);
    const meta: ProductMeta = {
      storeIdentifier: body?.store_identifier ?? null,
      periodType: duration ? (PERIOD_BY_DURATION[duration] ?? 'other') : null,
    };
    productCache.set(productId, meta);
    return meta;
  } catch {
    return null;
  }
};

// Which plan is currently granting access. Returns null on a transient failure so
// the caller can leave stored plan columns untouched (see ProState.plan).
const fetchPlan = async (
  projectId: string,
  rcKey: string,
  userId: string,
): Promise<ProPlan | null> => {
  try {
    const res = await rcFetch(
      `/projects/${projectId}/customers/${encodeURIComponent(userId)}/subscriptions`,
      rcKey,
    );
    // 404 = no subscriptions on record. That is a definite answer, not a failure:
    // the caller is Pro via a promotional or lifetime grant with no subscription
    // behind it, so record "no plan" rather than refusing to write.
    if (!res.ok) return res.status === 404 ? NO_PLAN : null;

    const body = await res.json();
    const items = (body.items ?? []) as {
      product_id?: string;
      store?: string;
      auto_renewal_status?: string;
      gives_access?: boolean;
    }[];

    // gives_access is RevenueCat's own answer to "is this subscription currently
    // granting its entitlements", so prefer it over re-deriving from status and
    // dates. A customer who upgraded mid-cycle can hold an expired subscription
    // alongside the live one; only the live one describes what they are paying for.
    const sub = items.find((s) => s.gives_access);
    if (!sub) return NO_PLAN;

    const product = sub.product_id ? await fetchProduct(projectId, rcKey, sub.product_id) : null;
    return {
      // Fall back to RevenueCat's internal product id when the product lookup fails
      // — less readable than a store identifier, but it still identifies the plan.
      productId: product?.storeIdentifier ?? sub.product_id ?? null,
      periodType: product?.periodType ?? null,
      store: sub.store ?? null,
      autoRenew:
        typeof sub.auto_renewal_status === 'string'
          ? !NOT_RENEWING.has(sub.auto_renewal_status)
          : null,
    };
  } catch {
    return null;
  }
};

// Returns null on a transient RevenueCat failure (caller should 502 / not write).
export const fetchProState = async (userId: string): Promise<ProState | null> => {
  const rcKey = Deno.env.get('REVENUECAT_API_KEY');
  const projectId = Deno.env.get('REVENUECAT_PROJECT_ID');
  if (!rcKey || !projectId) return null;

  const res = await rcFetch(
    `/projects/${projectId}/customers/${encodeURIComponent(userId)}/active_entitlements`,
    rcKey,
  );
  // 404 = RevenueCat has never seen this customer → definitively not Pro.
  if (!res.ok) return res.status === 404 ? { isPro: false, expiresAt: null, plan: NO_PLAN } : null;

  const body = await res.json();
  const items = (body.items ?? []) as {
    entitlement_id?: string;
    expires_at?: number | string | null;
  }[];

  const proId = await resolveProEntitlementId(projectId, rcKey);
  const pro = proId ? items.find((e) => e.entitlement_id === proId) : items[0];
  // Not Pro: clear any stored plan rather than leaving a churned user's last known
  // product on the row, where it would read as a live subscription.
  if (!pro) return { isPro: false, expiresAt: null, plan: NO_PLAN };

  // active_entitlements only returns currently-active grants, so isPro is
  // authoritative. Only trust a future expires_at; otherwise leave it null
  // (= active) so a mis-parse can't mark a paying user expired.
  let expiresAt: string | null = null;
  if (pro.expires_at != null) {
    const d = new Date(pro.expires_at);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) expiresAt = d.toISOString();
  }

  // Plan detail is supplementary: a failure here must not cost us the entitlement
  // write, which is what actually gates the user's access.
  const plan = await fetchPlan(projectId, rcKey, userId);
  return { isPro: true, expiresAt, plan };
};

// The api.entitlements row for an upsert. Plan columns are OMITTED when the plan
// lookup failed — PostgREST derives the ON CONFLICT DO UPDATE column list from the
// payload keys, so omitting them leaves the stored values alone instead of blanking
// good data.
export const entitlementRow = (
  userId: string,
  state: ProState,
  eventType: string | null,
  now: string,
) => ({
  user_id: userId,
  is_pro: state.isPro,
  expires_at: state.expiresAt,
  event_type: eventType,
  updated_at: now,
  ...(state.plan
    ? {
        product_id: state.plan.productId,
        period_type: state.plan.periodType,
        store: state.plan.store,
        auto_renew: state.plan.autoRenew,
      }
    : {}),
});
