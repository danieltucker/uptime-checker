# WatchTower — Uptime Monitor

WatchTower is a self-hosted uptime monitoring dashboard built for developers, homelabbers, and small teams who want visibility into their infrastructure without the overhead of a full observability stack.

Run it on a Raspberry Pi, a home server, or a cheap VPS and get instant visibility into everything on your network — from public-facing APIs and websites to internal services like a Plex server, a NAS, a router, a local database port, or a self-hosted app behind a reverse proxy. It's equally at home tracking a handful of production services for a side project or watching dozens of hosts across a homelab.

Under the hood it makes real HTTP(S), TCP, and ICMP checks on configurable intervals and stores the results in SQLite. The browser connects via Server-Sent Events so every check result appears on screen the moment it lands — no page refresh, no polling. When a host goes down, an alert is raised immediately with a live elapsed-time counter; when it recovers, the alert is marked resolved with total downtime recorded. A built-in Network Reference strip (Google, Cloudflare, 8.8.8.8) runs alongside your monitors so you can tell at a glance whether an outage is on your end or theirs.

The whole stack ships as a single Docker Compose service — build, run, and forget. SQLite data is mounted on a named volume so check history survives container restarts.

![Status: Active](https://img.shields.io/badge/status-active-green)
![Version](https://img.shields.io/badge/version-2.0-blue)

---

## Features

- **Add monitors** — track any IP address or domain name
- **Three check types** — HTTP(S) with timing breakdown, TCP port reachability, ICMP ping
- **Real checks** — actual network requests, not simulated data
- **Live dashboard** — cards update in real time via Server-Sent Events (no polling)
- **Detailed timing** — DNS, TCP, TLS, and TTFB measured separately for HTTP checks
- **SSL certificate monitoring** — days until expiry shown on HTTPS monitors
- **Graphical sparkline tooltip** — hover shows DNS/TCP/TLS/TTFB as proportional colored bars with ms labels
- **Configurable history window** — choose 10, 20, or 50 data points in the sparkline (persists across sessions)
- **Uptime percentage** — rolling calculation over the last 50 checks
- **Summary bar** — total monitors, online/offline count, average ping across all hosts
- **Status badges** — UP (green), DOWN (red + pulse), PENDING (amber)
- **Tag filtering** — filter the dashboard grid by one or more tags; multiple tags use OR logic
- **Tag autocomplete** — the tag input suggests existing tags as you type and lets you create new ones
- **Edit / Delete** — update any monitor config; changes take effect on the next check
- **Alert type tagging** — mark monitors with Email / SMS / Webhook / None
- **Alerts panel** — bell icon shows active and resolved outage alerts; ongoing alerts display a live elapsed-time counter; dismissed individually or all at once; persists across reloads
- **Network Reference section** — Google, Cloudflare (1.1.1.1), Google DNS (8.8.8.8), and Cloudflare.com are auto-seeded on first run and shown in a compact strip at the bottom of the dashboard to help distinguish app-level failures from network-level ones
- **Dark / Light theme** — toggle with the sun/moon button in the header; preference persists in localStorage
- **Persistent storage** — all monitors and check history survive restarts (SQLite)

---

## Tech Stack

| Layer      | Library / Tool                        |
|------------|---------------------------------------|
| UI         | React 18 (hooks + context)            |
| Styling    | Tailwind CSS (CDN play script)        |
| Charts     | recharts `AreaChart`                  |
| Icons      | lucide-react                          |
| Bundler    | Vite 5                                |
| Backend    | Node.js 20 + Express 4                |
| Database   | SQLite via better-sqlite3 (WAL mode)  |
| HTTP checks| got 13                                |
| Real-time  | Server-Sent Events (EventSource API)  |
| Container  | Docker + Docker Compose               |

---

## Getting Started

### Docker (recommended)

**Prerequisites:** Docker + Docker Compose

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is stored in a named volume (`watchtower-data`) so data survives container restarts.

### Development (local)

**Prerequisites:** Node.js 20+

Run the backend and frontend separately in two terminals:

```bash
# Terminal 1 — backend (Express API on :3000)
cd server
npm install
npm run dev

# Terminal 2 — frontend dev server (Vite on :5173, proxies /api → :3000)
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
# Production build (outputs to server/public/, served by Express)
npm run build
```

---

## API

| Method | Path                        | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/monitors`             | List all monitors with history |
| GET    | `/api/monitors/:id`         | Get a single monitor           |
| POST   | `/api/monitors`             | Create a monitor               |
| PUT    | `/api/monitors/:id`         | Update a monitor               |
| DELETE | `/api/monitors/:id`         | Delete a monitor               |
| POST   | `/api/monitors/:id/check`   | Trigger an immediate check     |
| GET    | `/api/events`               | SSE stream of check results    |

### Monitor fields

| Field        | Type                  | Description                                      |
|--------------|-----------------------|--------------------------------------------------|
| `target`     | string                | IP address, hostname, or URL                     |
| `label`      | string                | Display name (defaults to target)                |
| `description`| string                | Optional notes                                   |
| `checkType`  | `http`\|`tcp`\|`icmp` | Check strategy                                   |
| `interval`   | number (seconds)      | How often to run checks (default: 60)            |
| `port`       | number                | Required for TCP checks                          |
| `alertTypes` | string[]              | `Email`, `SMS`, `Webhook`, or `None`             |
| `tags`       | string[]              | Freeform grouping labels; `_ref` is reserved for built-in reference monitors |

---

## Project Structure

```
uptime-checker/
├── Dockerfile                       # Multi-stage build (frontend → server deps → runtime)
├── docker-compose.yml
├── index.html                       # Tailwind CDN, dark body background
├── vite.config.js
├── src/                             # React frontend
│   ├── main.jsx                     # Entry point, wraps app in ThemeProvider
│   ├── App.jsx                      # Root layout, tag filter, alerts, reference seeding
│   ├── types/
│   │   └── monitor.js               # Monitor schema + formatters
│   ├── hooks/
│   │   ├── useMonitors.js           # REST + SSE state layer
│   │   └── useTheme.jsx             # Dark/light theme context + token sets
│   └── components/
│       ├── SummaryBar.jsx           # Aggregate stats bar
│       ├── MonitorCard.jsx          # Monitor card, graphical tooltip, compact mode
│       ├── MonitorForm.jsx          # Add / Edit modal with tag autocomplete
│       └── AlertsPanel.jsx          # Dismissable outage alert panel
└── server/                          # Node.js backend
    ├── package.json
    └── src/
        ├── server.js                # Express app + static serving
        ├── scheduler.js             # setInterval per monitor, persists results
        ├── sse.js                   # SSE broadcast to connected clients
        ├── db/
        │   └── index.js             # SQLite schema + migrations (better-sqlite3)
        ├── checkers/
        │   ├── index.js             # Dispatcher (http / tcp / icmp)
        │   ├── http.js              # got-based HTTP check with timing breakdown
        │   ├── tcp.js               # TCP port reachability
        │   └── icmp.js              # ICMP ping (requires NET_RAW capability)
        └── routes/
            └── monitors.js          # CRUD endpoints + manual trigger
```

---

## License

MIT
