# Changelog

All notable changes to WatchTower are documented here.

---

## v5.3.0

### Theme system

- **6 themes** selectable in Settings > Appearance — Default, Midnight, Terminal, Ocean, Nord, and Mocha
- Each theme ships with a **dark and light variant**; the mode selector (Light / Auto / Dark) determines which variant is shown — themes and mode are independent choices
- **Theme swatch picker** in the Appearance tab — a 2×3 grid of cards, each with a mini card preview showing the theme's color palette; active theme has a blue ring; selection applies instantly
- Themes are stored in localStorage as `wt-theme-name`; existing installs default to Default
- **Midnight** — near-black deep blue base; cool blue-white text; dramatically deeper than Default
- **Terminal** — true black background; phosphor green (`#33ff33`) primary text; light variant uses warm cream paper with dark pine green text
- **Ocean** — deep navy base; cool blue-white text; light variant is coastal mist with pale blue-grey backgrounds
- **Nord** — the classic Nord palette (Polar Night bases, Snow Storm text); light variant uses the Nord snow-storm greys
- **Mocha** — rich espresso browns; warm cream/ivory text; light variant is warm parchment with dark espresso text

---

## v5.2.0

### Appearance settings

- New **Appearance** tab in Settings — the first tab in the panel, reserved for theme and future visual preferences
- **Three-way theme selector** — choose Light, Auto, or Dark; replaces the sun/moon toggle that previously lived in the header
- **Auto mode** follows the operating system's dark/light preference via the browser's `prefers-color-scheme` API — no configuration required and no page reload needed; the theme switches the instant the OS setting changes
- New installs default to **Auto**; existing `light` or `dark` preferences stored in localStorage are preserved as-is
- When Auto is active, a note in the tab shows which mode is currently resolved ("Currently showing dark/light mode based on your OS setting")

---

## v5.1.0

### Network Reference Settings

Network reference monitors are now fully configurable from **Settings > Network** instead of being hardcoded at startup.

- **14 built-in presets** — 8 HTTP endpoints (Google, Cloudflare, Microsoft, Apple, Amazon, GitHub, Discord, Slack) and 6 DNS/ICMP targets (Cloudflare DNS 1.1.1.1, Google DNS 8.8.8.8, Quad9, OpenDNS, Level3 DNS, Alibaba DNS)
- **Toggle any preset on or off** — only the monitors you enable appear in the reference strip; the default set matches the four monitors previously seeded automatically (Google, Cloudflare, Cloudflare DNS, Google DNS)
- **Custom references** — add any HTTP URL or IP address with a label and check type (HTTP or ICMP); useful for routers, local servers, or any private host you want visible in the strip
- **Instant sync** — saving the Network tab creates or deletes reference monitors immediately; no restart required
- **Existing installs migrate cleanly** — the four previously auto-seeded monitors remain active and are reflected as enabled in the new UI; no duplicates are created on first save

---

## v5.0.0

### Scheduled email reports

- New **Reports** tab in Settings — configure a daily, weekly, or monthly status report sent via email at a chosen time
- Reports cover the full period since the last send: per-monitor uptime %, average ping, incident count, and total checks, plus an aggregate summary strip (average uptime, monitors up/down, total count)
- Optional **tag filter** restricts the report to monitors matching a specific tag; blank includes all monitors
- **Test button** sends an immediate 24-hour preview without touching the schedule or updating the last-sent timestamp
- **Validation** — the save button blocks enabling reports when SMTP credentials are not yet configured in Notifications, and highlights the send-time field if it is blank
- Reports use SMTP credentials from the Notifications tab directly — the Email alert channel does not need to be enabled for alerts, only configured
- `report_last_sent` is managed server-side only and cannot be overwritten via the settings API

### Email client compatibility

- Report emails now include `bgcolor` HTML attributes on every table cell — Outlook 2007–2019 uses Word's rendering engine and ignores CSS `background` on table cells; without `bgcolor` the dark header sections render white, making the text invisible
- Added `<meta name="color-scheme" content="light">` and `<meta name="supported-color-schemes" content="light">` to prevent Gmail and Apple Mail from inverting the dark header in dark mode
- Row background colors moved from `<tr>` (ignored by Outlook) to individual `<td>` elements
- Status badges rebuilt as inline tables rather than `<span>` elements with background (Outlook ignores `background` on inline elements)
- Plain-text fallback included for clients that don't render HTML

### SMTP provider presets

- One-click **Quick setup** buttons in the Email channel: **Gmail**, **Outlook**, **Yahoo**, **iCloud**
- Clicking a provider auto-fills the SMTP host and port; the active provider is highlighted in blue
- A contextual note appears below the buttons for providers that require an App Password, with instructions specific to that provider
- Host and port fields remain fully editable for custom relays

---

## v4.5.0

### Module add flow

- **Add** button (renamed from "Add Monitor") now opens a tabbed modal with **Monitor** and **Module** tabs
- Module tab lists all installed modules with name, description, and an "Add card" button — no longer requires navigating to Settings
- Clicking "Add card" closes the picker and opens the module instance form directly
- Edit monitor flow is unchanged (tab bar is hidden when editing)

### Settings > Modules tab

- Simplified to credentials only — API keys and module-specific settings per module
- Instance management (add/remove cards) moved to the main Add flow
- Version label updated to v4.5

### Bug fixes

- Fixed "Unknown module" error when adding a module instance — server registry now uses `pathToFileURL` for reliable dynamic imports on Windows
- Fixed incorrect Anthropic usage API endpoint (`/v1/usage` → `/v1/organizations/usage_report/messages`) and updated token field names to match the reporting API response
- All `alert()` popup errors replaced with in-page error display (module instance form footer, monitor form footer, page-level toast for delete failures)

---

## v4.4.0

### Module system

A plugin architecture that extends WatchTower beyond uptime monitoring. Modules render as cards in the **Modules** section of the main dashboard grid and follow the same visual language as monitor cards.

- **Auto-discovery** — drop a module folder into `server/src/modules/` and `src/modules/` and restart; no manual registration required
- **Module instances** — one module type can have multiple cards (e.g. one Cloudflare Analytics card per zone)
- **Credentials** — module API keys are stored in the existing `settings` table under a namespaced prefix and managed in **Settings > Modules**
- **Per-instance config** — instance-specific fields (e.g. Zone ID) are defined by the module and collected when adding a card
- **Manual refresh** — each module card has a refresh button to fetch data on demand
- **MODULES.md** — full documentation for building new modules

### Bundled modules

**Claude API Usage** — polls the Anthropic Admin API for token usage across models for the current billing period. Requires an Admin API key from the Anthropic Console (standard inference keys do not have usage read access).

**Cloudflare Analytics** — queries the Cloudflare GraphQL Analytics API for a configured zone. Shows 7-day totals for requests, pageviews, unique visitors, and bandwidth, plus a daily requests bar chart. Requires a Cloudflare API token with `Analytics:Read` permission and a Zone ID.

### Settings panel

- New **Modules** tab — lists installed modules, credential fields, and dashboard card instances; supports adding and removing cards without leaving Settings
- Version label updated to v4.4

### Y-axis scale setting

- Renamed from "Sparkline Y-axis scale" to "Chart scale" with a simpler description

---

## v4.3.0

### Degraded threshold line on sparklines

- When a degraded ping threshold is configured on an HTTP or API monitor, an amber dashed reference line is drawn across the sparkline at that value, making it easy to see at a glance which time buckets exceeded the threshold
- The line respects the Y-axis scale setting — if the threshold value is above the visible range it simply won't appear, which is intentional

### Sparkline Y-axis scale

- New setting in the **General** tab: **Sparkline Y-axis scale** — choose between Auto (natural data range), 250ms, 500ms, or 750ms
- Setting persists across sessions; when a fixed scale is chosen all cards share the same Y-axis, making ping comparisons across monitors consistent
- Combined with the degraded threshold line, a fixed scale guarantees the reference line is always visible when a threshold is set within that range

### Degraded threshold and alert row for API monitors

- The **Degraded Threshold** field (ping ms) is now available on API check type monitors in addition to HTTP, since both check types perform timed HTTP requests and return identical timing data
- The **Degraded** row in the Alert Behaviour table is now hidden for TCP and ICMP monitor types, where a ping threshold doesn't apply — only HTTP and API monitors show it

---

## v4.2.2

### Bug fix

- Fixed an issue where the Settings panel allowed saving with alert channels toggled on but no credentials entered. Save now validates all enabled channels before writing to the database — missing required fields are highlighted in red with a "— required" label, the channel card border turns red, and an error message appears in the footer explaining which channels need attention. Errors clear field-by-field as the user fills them in.

---

## v4.2.1

### Webhook alert channel

- New **Webhook** channel in the Notifications tab — paste any URL and WatchTower will POST a JSON payload on every alert event
- Payload includes `event` (`down` / `degraded` / `recovered`), monitor details (`id`, `label`, `target`, `checkType`, `tags`), and a UTC timestamp; compatible with Slack incoming webhooks, Discord, n8n, Zapier, Make, ntfy.sh, and any HTTP endpoint
- Behaves like all other channels: must be enabled in Settings before it appears in the monitor form, and save is blocked if the URL is missing

### Bug fix

- Fixed Webhook appearing in the monitor notification channel picker even though it had no configuration UI and no implementation — selecting it previously fired nothing silently

---

## v4.2.0

### New check type: API

A dedicated check type for REST and JSON API endpoints. HTTP checks are now reachability-only; body and response validation belong here.

- **Expected status code** — exact match (default: 200); the check is treated as DOWN if the response code differs
- **Body Contains** — optional plain-string, case-insensitive substring match on the response body
- **JSON assertion** — dot-notation field path (e.g. `data.status`) plus an expected value; DOWN if the field is missing or the value doesn't match
- **Authentication** — Basic Auth (username + password) or Bearer Token per monitor
- **Custom headers** — up to five arbitrary key-value header pairs (useful for `X-API-Key` and similar schemes)
- Full timing breakdown (DNS, TCP, TLS, TTFB) identical to HTTP checks
- Assertion failure reason shown directly on the card when a monitor is DOWN

> **Security note:** authentication credentials are stored as plaintext in SQLite alongside other monitor config. Credential encryption is planned for a future release.

### Migration

Existing HTTP monitors with a "Body Contains" value are automatically migrated to the API check type on first run. All other settings are preserved.

---

## v4.1.1

### Bug fixes

- Fixed an issue where all HTTP/HTTPS monitors reported DOWN after v4.1.0. The 256 KB response size cap was applied to every HTTP request, causing large responses to fail with an overflow error even when body validation was not configured.
- Modal windows (Add/Edit monitor, Settings, Embed) now scroll correctly when the browser viewport is shorter than the modal height.

---

## v4.1.0

### Alert channel filtering

- The notification channel picker in the monitor form only shows channels that are toggled **enabled** in Settings
- Selecting an enabled channel that has incomplete credentials shows a warning indicator and blocks save with a clear error message — preventing silent alert failures

### HTTP response body validation

- Optional "Body Contains" field on HTTP monitors — plain string, case-insensitive
- If set, the response body must contain the string or the check is treated as DOWN regardless of HTTP status code
- Response bodies over 256 KB are aborted and treated as a failed body check; the cap also protects the server from memory exhaustion on large API responses
- Body content is never stored — only the pass/fail result is recorded

---

## v4.0.0

### Card layout and sorting

- Cards can be manually reordered by dragging — grab anywhere in the card header and drop to rearrange; order persists in localStorage
- Cards are resizable between 1-column and 2-column widths via the **Wide / Narrow** button in the card header; persists in localStorage
- Resize is responsive: a 2-wide card stays 2 columns on wider viewports and collapses to full width on narrow ones
- Drag-to-reorder is active in Default sort mode; switching to Uptime or Ping sort disables drag handles

### Settings panel

- Redesigned as a fixed-size centered modal with left-side vertical tab navigation
- **General tab** — dashboard-wide preferences including the grouped vs flat view toggle
- **Notifications tab** — Telegram, Email, and SMS channel configuration
