# WaBiri WhatsApp Integration: Technical Post-Mortem

This document serves as a complete history and explanation of the bugs encountered and fixed while stabilizing the Evolution API WhatsApp integration. Use this as a reference guide for future debugging.

---

## 1. The React "Race Condition" Bug
**The Error**: `Couldn't link device` or `No QR code returned from server`
**The Context**: We had `qrcode: false` during the instance creation payload and tried to manually fetch the QR code a split-second later using a separate API call. 
**Why it failed**: Evolution API needs a moment to initialize the Baileys WebSocket. By demanding the QR code instantly, we were beating the backend to the punch, retrieving corrupted or stale QR data that led WhatsApp to reject the handshake.
**The Fix**: Restored the "One-Shot" method. We pass `qrcode: true` directly in the creation payload, which intrinsically delays the response until the exact millisecond the server has fully materialized the socket.

## 2. The Cloudflare Tunnel URL Mismatch
**The Error**: `Prisma P2025: Record not found`
**The Context**: The Vercel app was attempting to link WhatsApp devices.
**Why it failed**: The app's `.env` files were pointing to an old Cloudflare Tunnel (`symptoms-visiting...`) while the actual active Evolution backend was running on a new tunnel (`masters-sacramento...`). Because the frontend forced action on a server that didn't literally have the instance, Supabase threw a P2025 error.
**The Fix**: Unified the `EVOLUTION_URL` across the `.env` file, ensuring the Vercel proxy (`api/whatsapp.js`) and the frontend were talking to the correct active backend.

## 3. The Supabase "Missing Schema" Error
**The Error**: `Could not find the table 'public.contacts' in the schema cache`
**The Context**: Attempting to save contacts or sync them from the phone to the web dashboard.
**Why it failed**: Supabase provides an empty PostgreSQL database out of the box. There were no tables to store the synced WaBiri data.
**The Fix**: Executed the raw SQL database schema creation for `contacts`, `campaigns`, and `workspaces`, complete with Row Level Security (RLS) to enforce data privacy per user.

## 4. The SPA `404: NOT_FOUND` Routing Bug
**The Error**: Vercel `404: NOT_FOUND` screen on `Ctrl+Shift+R` (Hard Refresh).
**The Context**: Refreshing any page other than the home page (e.g., `/dashboard` or `/instances`).
**Why it failed**: Vercel's server literally looks for physical folders like `dashboard.html`. Single Page Applications (SPAs) like React Router handle paths locally dynamically using JavaScript, but they need Vercel to default fallback to `index.html`.
**The Fix**: Added an explicit SPA "rewrite" rule in the `vercel.json` file to pipe `/(.*)` back to `/index.html`, letting React Router take over smoothly.

## 5. The Evolution API Docker Networking Crash
**The Error**: `fetch failed` (502 Bad Gateway) and `Address in use`
**The Context**: The Evolution API dropped the WebSocket handshake cleanly when the WhatsApp QR was scanned.
**Why it failed**: 
This was a multi-tiered backend Docker conflict:
1.  **The Redis Clash**: Your laptop automatically runs a local Redis server natively on port `6379`. However, the `docker-compose.yml` for Evolution forced the internal Docker Redis container into `network_mode: host`. This caused the Docker Redis to fight for the exact same port and infinitely crash-loop. Without Redis, Evolution API could not save its WhatsApp WebSocket encryption keys, causing the instant link rejection.
2.  **The Supabase IPv6 Trap**: Attempting to fix the Redis clash by putting Evolution API on an internal bridge network incidentally severed its IPv6 connectivity. Supabase mandates IPv6 for port `5432` connections via its `db.*.supabase.co` domains. This immediately crash-looped the entire Evolution API due to a Prisma database initialization failure (`P1001: Can't reach database`).
**The Fix**: Removed the redundant Docker Redis container completely from `docker-compose.yml`. Restored `network_mode: host` to the Evolution API (restoring its IPv6 database connectivity), and pointed its `CACHE_REDIS_URI` directly at your laptop's natively running local `redis-server`.

## 6. The "Sync Latency" Race Condition
**The Error**: `couldn't link device, try again later` (on the phone)
**The Context**: Scanning the QR code starts the handshake, but the link fails immediately.
**Why it failed**: When you scan, the "Baileys" engine inside Evolution API immediately tries to **update** the instance status in the database. When the database is a remote Supabase instance over the internet, a "Race Condition" occurs: the update request (heartbeat) arrives at Supabase before the original "create instance" record has even finished being flushed over the network. Prisma then throws `P2025: No record found to update`, which crashes the server's handshake process and disconnects the phone.
**The Fix**: Switched the `DATABASE_PROVIDER` inside the backend from `PostgreSQL` to `SQLite`. 
1. `DATABASE_PROVIDER=sqlite`
2. `DATABASE_URL=file:../data/database.sqlite`
This stores ephemeral WhatsApp instance states locally on your machine with near-zero latency, ensuring the handshake completes every time without network-related Prisma crashes.

---

### Core Architecture Takeaways
1.  **Evolution API v2** is strictly reliant on database and cache state. If its Redis connection drops, it will *appear* totally fine on the frontend but will immediately fail WhatsApp Web socket handshakes.
2.  **Serverless Proxies** mask backend failures. A Vercel `fetch failed` almost universally implies your Cloudflare tunnel crashed or the Docker container behind the tunnel couldn't boot.
3.  **Local-First for States**: Ephemeral connection states (Instances) should **always** remain local-first (SQLite or Redis). Forcing these fast-moving heartbeats to a remote cloud DB like Supabase creates network-bound race conditions (P2025) that break the sensitive WhatsApp handshake. Keep Supabase for your core business data (Contacts, Campaigns) and use SQLite for the internal WhatsApp engine logic.
