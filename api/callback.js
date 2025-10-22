// /api/callback.js
module.exports = async (req, res) => {
  const code = req.query && req.query.code;
  const state = decodeURIComponent((req.query && req.query.state) || "");
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, PUBLIC_BASE_URL, OAUTH_ALLOWED_ORIGINS } =
    process.env;

  if (!code) {
    res.statusCode = 400;
    res.end("Missing ?code");
    return;
  }

  const redirectUri = `${PUBLIC_BASE_URL}/api/callback`;

  // Обмен кода на access_token у GitHub
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await tokenRes.json(); // { access_token?: string, ... }

  if (!data.access_token) {
    res.statusCode = 401;
    res.end(`OAuth error: ${JSON.stringify(data)}`);
    return;
  }

  // Куда возвращать токен (разрешённые источники)
  const allowed = (OAUTH_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const targetOrigin = allowed.includes(state)
    ? state
    : allowed[0] || "*";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html><body><script>
    (function(){
      var token=${JSON.stringify(data.access_token)};
      var origin=${JSON.stringify(targetOrigin)};
      if(window.opener){
        window.opener.postMessage({ token: token }, origin);
        window.close();
      } else {
        document.body.innerText = "Token: " + token;
      }
    })();
  </script></body></html>`);
};
