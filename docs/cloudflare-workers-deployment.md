# Cloudflare Workers and D1 deployment

This app is configured to run on:

- **Cloudflare Workers** for the TanStack Start server runtime
- **Cloudflare D1** for the application and Better Auth database

## Repository files involved

- `wrangler.jsonc` - Worker entrypoint, compatibility flags, and D1 binding
- `migrations/0001_initial.sql` - initial D1 schema
- `.dev.vars.example` - local Cloudflare runtime vars/secrets example
- `.env.example` - env reference for the app

## 1. Create the D1 databases

Create your production D1 database:

```bash
pnpm exec wrangler d1 create flamette-money
```

If you want a separate preview database for branch deployments, create one more:

```bash
pnpm exec wrangler d1 create flamette-money-preview
```

Copy the returned IDs into `wrangler.jsonc`:

- `database_id` -> production database ID
- `preview_database_id` -> preview database ID

If you do not want a separate preview database, you can temporarily reuse the production ID, but keeping preview data separate is safer.

## 2. Configure runtime secrets and variables

Set these in Cloudflare under **Workers & Pages -> your Worker -> Settings -> Variables & Secrets**:

### Secrets

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET` (if used)
- `GITHUB_CLIENT_SECRET` (if used)
- `OPENROUTER_API_KEY` (if used)
- `EXCHANGE_RATE_API_KEY` (if used)

### Plain text variables

- `BETTER_AUTH_URL`
- `BETTER_AUTH_ALLOWED_HOSTS` (optional)
- `BETTER_AUTH_TRUSTED_ORIGINS` (optional)
- `GOOGLE_CLIENT_ID` (if used)
- `GITHUB_CLIENT_ID` (if used)
- `OPENROUTER_MODEL` (optional)
- `EXCHANGE_RATE_CACHE_HOURS` (optional)

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in the values you need.

## 3. Apply the initial migration

Apply the schema to your local D1 database:

```bash
pnpm exec wrangler d1 migrations apply flamette-money --local
```

Apply the same schema to your remote production D1 database:

```bash
pnpm exec wrangler d1 migrations apply flamette-money --remote
```

Cloudflare does **not** apply D1 migrations automatically during `wrangler deploy`. Schema changes remain a separate step unless you explicitly automate them in your deploy command.

## 4. Local development

After `wrangler.jsonc` and `.dev.vars` are configured:

```bash
pnpm install
pnpm dev
```

## 5. Manual deployment

```bash
pnpm run build
pnpm exec wrangler deploy
```

## 6. Automatic deployment on push to `main` with Workers Builds

1. In Cloudflare, open **Workers & Pages**.
2. Create a Worker or open the existing Worker for this app.
3. Open **Settings -> Builds**.
4. Connect the GitHub repository.
5. Set the production branch to `main`.
6. Use these build settings:
   - **Build command:** `pnpm run build`
   - **Deploy command:** `pnpm exec wrangler deploy`
   - **Non-production branch deploy command:** `pnpm exec wrangler versions upload`
7. Set the **Root directory** to the repository root.
8. Add the runtime variables and secrets from step 2.
9. Push to `main`.

That gives you automatic code deployments on every push to `main`.

## 7. If you want migrations to run during Workers Builds too

Workers Builds can run a custom deploy command. If you want deployments to also apply pending D1 migrations automatically, change the deploy command to:

```bash
pnpm exec wrangler d1 migrations apply flamette-money --remote && pnpm exec wrangler deploy
```

Use that only after:

- `wrangler.jsonc` has the correct production D1 database ID
- your Worker build token has permission to manage D1
- you are comfortable applying migrations automatically during deployment

If you prefer a safer rollout, keep migrations as a separate explicit step.
