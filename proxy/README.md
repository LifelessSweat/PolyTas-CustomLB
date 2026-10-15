# Deploy the leaderboard proxy

This Worker gives the game a proxy endpoint you deploy under your own Cloudflare
account. It forwards the game's `/v6/*` API requests to `https://vps.kodub.com`;
the Worker is your proxy, while the upstream remains the game service.

## GitHub Actions deployment

1. In Cloudflare, create an API token with **Workers Scripts: Edit** and account
   access for the account that owns your `workers.dev` subdomain.
2. In the GitHub repository, add these Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Ensure your account's `workers.dev` subdomain is enabled. The Worker name in
   [wrangler.toml](wrangler.toml) is `polytrackproxy`, producing
   `https://polytrackproxy.<your-subdomain>.workers.dev`.
4. Push a change under `proxy/` to `main`, or manually run **Deploy leaderboard
   proxy** from the Actions tab.
5. Confirm this read-only request returns HTTP 200 and JSON:

   ```text
   https://polytrackproxy.<your-subdomain>.workers.dev/v6/leaderboard?version=0.6.2&trackId=<track-hash>&skip=0&amount=1&onlyVerified=true
   ```

The Worker only forwards `/v6/*` paths, preserves the query and POST body, and
returns upstream errors instead of a success-shaped fallback. It does not proxy
arbitrary URLs. Do not put the Cloudflare API token in the repository or workflow
file.

Run its local tests with:

```sh
node --test proxy/test/worker.test.mjs
```
