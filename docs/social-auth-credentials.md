# Social auth credentials

Use this guide to create the OAuth client ID and client secret for the Google and GitHub sign-in buttons.

## What you need

Better Auth uses these env vars:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

For local development, Better Auth accepts `localhost` on any port, but the OAuth provider consoles still need the exact callback URL you use.

## Better Auth callback URLs

These are the callback URLs this app uses:

- Google: `http://localhost:<port>/api/auth/callback/google`
- GitHub: `http://localhost:<port>/api/auth/callback/github`

For production, replace `http://localhost:<port>` with your deployed app origin.

## Google setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select or create a project.
3. Open **APIs & Services** → **OAuth consent screen** and finish the required branding fields.
4. Go to **APIs & Services** → **Credentials**.
5. Click **Create credentials** → **OAuth client ID**.
6. Choose **Web application**.
7. Add your app origin under **Authorized JavaScript origins**.
8. Add your Better Auth callback URL under **Authorized redirect URIs**.
9. Save the client.
10. Copy the generated **Client ID** and **Client secret** into your environment variables.

If you run multiple local branches on different ports, add each local callback URL you plan to use.

## GitHub setup

1. Open your GitHub account settings.
2. Go to **Developer settings** → **OAuth Apps**.
3. Click **New OAuth App**.
4. Fill in:
   - **Application name**
   - **Homepage URL**
   - **Authorization callback URL**: `http://localhost:<port>/api/auth/callback/github`
5. Register the app.
6. Copy the **Client ID** from the app page.
7. Click **Generate a new client secret** and save the secret.

## Important GitHub limitation

GitHub OAuth Apps support only one callback URL. If you run several local branches on different Vite ports, GitHub sign-in will only work for the one port you registered.

To avoid that:

- use one fixed local port for GitHub sign-in, or
- test GitHub auth on a single branch at a time, or
- use a stable dev domain that does not change between branches

## Recommended environment values

```bash
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

If you want a production base URL, also set:

```bash
BETTER_AUTH_URL=https://your-app.example.com
```
