// /api/auth.js
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

module.exports = (req, res) => {
  const { GITHUB_CLIENT_ID, PUBLIC_BASE_URL } = process.env;

  if (!GITHUB_CLIENT_ID || !PUBLIC_BASE_URL) {
    res.statusCode = 500;
    res.end("Missing env vars: GITHUB_CLIENT_ID or PUBLIC_BASE_URL");
    return;
  }

  const redirectUri = `${PUBLIC_BASE_URL}/api/callback`;
  const scope = (req.query && req.query.scope) || "repo";
  const referer =
    (req.headers && (req.headers.referer || req.headers.origin)) || "";

  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  // вернёмся в то окно, откуда пришли (админка), через state
  url.searchParams.set("state", encodeURIComponent(referer));
  url.searchParams.set("allow_signup", "true");

  res.statusCode = 302;
  res.setHeader("Location", url.toString());
  res.end();
};
