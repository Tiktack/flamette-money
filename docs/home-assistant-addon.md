# Running Flamette Money as a Home Assistant add-on

Flamette Money runs as a self-hosted Home Assistant **add-on** — a Docker container managed
by the Supervisor — backed by a local SQLite database. There is no Cloudflare or external
database dependency, so there are no per-row read quotas to exhaust.

> **Add-on, not HACS.** HACS installs Python integrations and Lovelace cards; it cannot run
> a web app. This is a custom **add-on repository**. It requires **Home Assistant OS** or a
> **Supervised** install (the typical Raspberry Pi setup). It will not work on the bare
> "Home Assistant Container" install.

## How the image is delivered

A GitHub Actions workflow (`.github/workflows/build-addon.yml`) builds a `linux/arm64`
image from the root `Dockerfile` and pushes it to the GitHub Container Registry:

```
ghcr.io/tiktack/flamette-money-aarch64:<version>
```

`<version>` matches the `version:` field in `flamette-money/config.yaml`. Home Assistant
substitutes `{arch}` in the add-on's `image:` field and pulls that tag.

### One-time setup

1. Push to `master` (or run the workflow manually) to build and publish the image.
2. In GitHub → **Packages**, set `flamette-money-aarch64` visibility to **Public** so the
   Supervisor can pull it without credentials.
3. When you change the app, bump `version:` in `flamette-money/config.yaml`. CI publishes
   the matching tag; Home Assistant then offers the update.

## Installing the add-on

1. **Settings → Add-ons → Add-on Store**.
2. **⋮ → Repositories**, add `https://github.com/Tiktack/flamette-money`.
3. Open **Flamette Money** and click **Install**.
4. On the **Configuration** tab, set at least `better_auth_secret`
   (`openssl rand -base64 32`). If you serve it through a public domain, set
   `better_auth_url` and `better_auth_trusted_origins` to that `https://…` origin.
5. **Start** the add-on and check the **Log** tab for `applied migration …` lines and a
   clean startup.

The database lives at `/data/flamette-money.db` in the add-on's persistent storage and
survives restarts and updates.

## Exposing it via Cloudflare Tunnel

The add-on listens on port **8744**. With the **cloudflared** add-on, add a public hostname
that points at this add-on's service:

```yaml
# cloudflared add-on configuration (example)
- hostname: money.example.com
  service: http://<flamette-money-addon-hostname>:8744
```

Add-ons can reach each other on the internal Docker network; you can also point cloudflared
at the host-mapped port (`http://homeassistant.local:8744`). Then set the add-on options:

- `better_auth_url: https://money.example.com`
- `better_auth_trusted_origins: https://money.example.com`

Because the public origin is HTTPS, secure cookies are enabled automatically.

### LAN-only access (no tunnel)

Open `http://homeassistant.local:8744`, leave `better_auth_url` empty, and set
`better_auth_use_secure_cookies: false` so the session cookie is sent over plain HTTP.

## Migrating existing data off Cloudflare D1

**Option A — faithful copy (recommended).** Export the D1 database to SQL and load it into
the add-on's SQLite file:

```bash
wrangler d1 export flamette-money --remote --output=dump.sql
```

Copy `dump.sql` to the add-on's `/data` (e.g. via the Samba/SSH add-on), then load it into
`/data/flamette-money.db`. Because the raw dump does not include the add-on's `_migrations`
bookkeeping, pre-seed it so the startup runner does not try to re-apply migrations that the
dump already contains:

```sql
-- run against /data/flamette-money.db before first start, after loading the dump
CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);
INSERT OR IGNORE INTO _migrations (name, applied_at)
VALUES ('0001_initial.sql', 0), ('0002_d1_query_optimization.sql', 0);
```

**Option B — app backup (no CLI).** On the old Cloudflare instance, export a backup from
**User Settings**, then import it on the new add-on instance. This goes through a fresh,
migrated database, so there are no schema conflicts.

## Health and lifecycle

- `GET /api/healthz` runs `SELECT 1` against SQLite; the Supervisor watchdog uses it to
  restart the add-on if it becomes unresponsive.
- On stop/restart the server checkpoints the WAL and closes the database cleanly.
