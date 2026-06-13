# Flamette Money

Self-hosted, multi-currency personal finance app. Runs entirely on your Home Assistant
host with a local SQLite database — no Cloudflare account or external database required.

## Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**.
2. Open the **⋮** menu (top right) → **Repositories**, and add:
   `https://github.com/Tiktack/flamette-money`
3. The **Flamette Money** add-on appears in the store. Click it and press **Install**.

## Configuration

| Option | Required | Notes |
| --- | --- | --- |
| `better_auth_secret` | **Yes** | Long random string. Generate with `openssl rand -base64 32`. |
| `better_auth_url` | Recommended | Public origin (e.g. `https://money.example.com`) served via your Cloudflare Tunnel. |
| `better_auth_trusted_origins` | Recommended | Usually the same value as `better_auth_url`. |
| `better_auth_use_secure_cookies` | No | Auto-derived from the URL (https ⇒ on). Set `false` for plain-http LAN access. |
| `openrouter_api_key` / `openrouter_model` | No | Enable AI receipt scanning. |
| `exchange_rate_api_key` | No | Enable live currency conversion in reports. |
| `google_*` / `github_*` | No | Optional social login (needs a public https URL). |

The SQLite database is stored at `/data/flamette-money.db` inside the add-on's persistent
storage, so it survives restarts and updates.

## Exposing the app

The add-on listens on port **8744**. With the **Cloudflare Tunnel (cloudflared)** add-on,
add a public hostname pointing at this add-on's service, e.g.
`http://<this-addon-hostname>:8744` (or `http://homeassistant.local:8744` via the mapped
host port). Set `better_auth_url` to the resulting `https://…` subdomain.

For LAN-only access, open `http://homeassistant.local:8744` and set
`better_auth_use_secure_cookies` to `false`.

## First run

Create an account with email + password on the sign-in page, then seed demo data from
**User Settings** if you want sample content. To bring data over from a previous
deployment, see the migration guide in the repository's `docs/home-assistant-addon.md`.

## Health

The add-on exposes `GET /api/healthz` (used by the Supervisor watchdog) which verifies the
database is reachable.
