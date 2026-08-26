-- Record WHICH plan a Pro user is on, not just that they are Pro.
--
-- api.entitlements has always been a deliberately thin mirror: is_pro + expires_at.
-- That answers the only question the free-entry-limit trigger asks ("may this user
-- write past the limit?"), but it cannot answer the questions that come up the first
-- time anyone looks at a specific subscriber -- monthly or annual? will it renew?
-- which store? -- because fetchProState read RevenueCat's active_entitlements
-- endpoint, which reports the grant and its expiry and nothing about the product
-- behind it. Answering by hand meant a live RevenueCat query per user.
--
-- fetchProState already talks to RevenueCat on every write, so these columns persist
-- what that round trip can learn instead of discarding it.
--
-- Every column is nullable and absence never means "not Pro":
--   * rows written before this migration have no plan data until their next event;
--   * RevenueCat can legitimately report an active entitlement with no backing
--     subscription (a promotional or lifetime grant), and that is still Pro.
-- Nothing reads these columns to make an access decision -- is_pro and expires_at
-- remain the only inputs to api.enforce_free_entry_limit.

alter table api.entitlements
  add column if not exists product_id  text,
  add column if not exists period_type text,
  add column if not exists store       text,
  add column if not exists auto_renew  boolean;

comment on column api.entitlements.product_id is
  'Store product identifier from RevenueCat (e.g. com.reflect.prod.pro_monthly). Null when the grant has no backing subscription.';

-- Deliberately not a CHECK constraint or an enum: this value originates at RevenueCat,
-- and a product duration we have not seen before must not be able to fail the webhook's
-- write. An unknown duration is stored as 'other' and the mirror stays current.
comment on column api.entitlements.period_type is
  'Billing period derived from the product duration: weekly, two_week, monthly, two_month, three_month, six_month, annual, lifetime, or other. Null when unknown.';

comment on column api.entitlements.store is
  'Store the subscription was purchased through: app_store, play_store, stripe, ...';

-- Distinct from expires_at: a subscription set to cancel is still Pro until it expires.
comment on column api.entitlements.auto_renew is
  'True when the subscription is set to renew at the end of the current period; false when it is set to cancel or pause.';
