// /api/callback.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const state = decodeURIComponent((req.query.state as string) || ""); // это origin админки
  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  const redirectUri = `${process.env.PUBLIC_BASE_URL}/api/callback`;

  if (!code) return res.status(400).send("Missing ?code");

  // Обмен кода на access_token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });

  const data = await tokenRes.json() as { access_token?: string; error?: string };
  const token = data.access_token;

  if (!token) {
    return res.status(401).send(`OAuth error: ${JSON.stringify(data)}`);
  }

  // Возвращаем маленькую страничку, которая передаст токен обратно в окно админки (Decap CMS)
  const allowedOrigins = (process.env.OAUTH_ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const targetOrigin = allowedOrigins.includes(state) ? state : "*";

  res.setHeader("Content-Type", "text/html; charset=utf-8").send(`
<!doctype html><html><body>
<script>
  (function(){
    var token = ${JSON.stringify(token)};
    var origin = ${JSON.stringify(targetOrigin)};
    if (window.opener) {
      window.opener.postMessage({ token: token }, origin);
      window.close();
    } else {
      document.body.innerText = "Token: " + token;
    }
  })();
</script>
</body></html>`);
}
