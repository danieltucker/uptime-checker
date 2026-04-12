# WatchTower — Uptime Monitor

A dark-themed, sysadmin-style uptime monitoring dashboard built with React. v1 runs entirely in the browser with simulated ping data, architected for a real backend in a future version.

![Status: Active](https://img.shields.io/badge/status-active-green)
![Version](https://img.shields.io/badge/version-1.0-blue)

---

## Features

- **Add monitors** — track any IP address or domain name
- **Live dashboard** — cards update on each configured check interval
- **Sparkline charts** — last 20 ping values rendered with recharts; red dots mark DOWN events
- **Summary bar** — total monitors, online/offline count, average ping across all hosts
- **Status badges** — UP (green), DOWN (red + pulse), PENDING (amber)
- **Simulated checks** — realistic 20–300ms ping values, occasional spikes, 5% DOWN rate
- **Edit / Delete** — update any monitor config; changing the interval restarts the check timer
- **Alert type tagging** — mark monitors with Email / SMS / Webhook / None
- **Freeform tags** — comma-separated labels for grouping

---

## Tech Stack

| Layer     | Library                          |
|-----------|----------------------------------|
| UI        | React 18 (hooks)                 |
| Styling   | Tailwind CSS (CDN play script)   |
| Charts    | recharts `AreaChart`             |
| Icons     | lucide-react                     |
| Bundler   | Vite 5                           |

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build    # production bundle → dist/
npm run preview  # preview the production build locally
```

---

## Project Structure

```
uptime-checker/
├── index.html                   # Tailwind CDN, dark body background
├── vite.config.js
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root layout, empty state, monitor grid
│   ├── types/
│   │   └── monitor.js           # Monitor schema, createMonitor(), formatters
│   ├── hooks/
│   │   └── useMonitors.js       # CRUD state + setInterval simulation layer
│   └── components/
│       ├── SummaryBar.jsx       # Aggregate stats bar
│       ├── MonitorCard.jsx      # Individual monitor card + sparkline
│       └── MonitorForm.jsx      # Add / Edit modal
```

---

## Roadmap (v2 — backend)

The simulation layer in `src/hooks/useMonitors.js` is isolated behind a clear interface. Every location where a real HTTP call replaces simulated logic is marked with a `// TODO: replace with API call` comment.

Planned backend:

- **Node.js / Express** REST API
- **SQLite** (dev) → **PostgreSQL** (prod)
- **Real HTTP checks** — HEAD requests with configurable timeout
- **ICMP ping** via a privileged sidecar or `net-ping`
- **Authentication** — JWT sessions
- **Docker Compose** deployment (app + db + reverse proxy)
- **Alert dispatch** — email (Nodemailer), SMS (Twilio), webhooks

---

## License

MIT
