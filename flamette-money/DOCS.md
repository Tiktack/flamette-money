# Flamette Money

Self-hosted, multi-currency personal finance app. Runs entirely on your Home Assistant
host with a local SQLite database — no Cloudflare account or external database required.

## Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**.
2. Open the **⋮** menu (top right) → **Repositories**, and add:
   `https://github.com/Tiktack/flamette-money`
3. The **Flamette Money** add-on appears in the store. Click it and press **Install**.

## Configuration

| Option                                    | Required    | Notes                                                                                                                           |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `better_auth_secret`                      | **Yes**     | Long random string. Generate with `openssl rand -base64 32`.                                                                    |
| `better_auth_url`                         | Recommended | Public origin (e.g. `https://money.example.com`) served via your Cloudflare Tunnel.                                             |
| `better_auth_trusted_origins`             | Recommended | Usually the same value as `better_auth_url`.                                                                                    |
| `better_auth_use_secure_cookies`          | No          | Auto-derived from the URL (https ⇒ on). Set `false` for plain-http LAN access.                                                  |
| `disable_signups`                         | No          | Turn on to block all new registrations (email + social). Existing users still sign in; the first account can always be created. |
| `openrouter_api_key` / `openrouter_model` | No          | Enable AI receipt scanning.                                                                                                     |
| `exchange_rate_api_key`                   | No          | Enable live currency conversion in reports.                                                                                     |
| `google_*` / `github_*`                   | No          | Optional social login (needs a public https URL).                                                                               |

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

## Backups

The database is stored in the add-on's persistent `/data` directory, so it is included in
Home Assistant backups (full or partial backups that select this add-on). Restoring such a
backup restores your accounts, transactions, and login accounts.

Backups run in **cold** mode (`backup: cold`): the add-on is briefly stopped during the
snapshot so the SQLite database is captured with no in-flight writes. Restoring re-pulls the
add-on image version recorded in the backup, so avoid deleting old image tags you may still
need to restore from.

You can also export/import a portable backup (XLSX) from **User Settings** inside the app —
useful for moving data between instances independently of Home Assistant backups.

## Health

The add-on exposes `GET /api/healthz` (used by the Supervisor watchdog) which verifies the
database is reachable.
