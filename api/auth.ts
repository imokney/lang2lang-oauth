// /api/auth.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_CLIENT_ID!;
  const redirectUri = `${process.env.PUBLIC_BASE_URL}/api/callback`;
  const scope = (req.query.scope as string) || "repo";
  const origin = (req.headers.referer as string) || "";

  // Передадим origin в state, чтобы на callback вернуть токен обратно на ту же страницу
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", encodeURIComponent(origin));
  url.searchParams.set("allow_signup", "true");

  res.status(302).setHeader("Location", url.toString()).end();
}
