// /api/callback.js
module.exports = async (req, res) => {
  const code = req.query && req.query.code;
  const state = decodeURIComponent((req.query && req.query.state) || "");
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, PUBLIC_BASE_URL, OAUTH_ALLOWED_ORIGINS } = process.env;

  if (!code) { res.statusCode = 400; res.end("Missing ?code"); return; }

  const redirectUri = `${PUBLIC_BASE_URL}/api/callback`;

  // Обмениваем код на токен у GitHub
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
  const data = await tokenRes.json(); // { access_token?: string }
  if (!data.access_token) {
    res.statusCode = 401;
    res.end(`OAuth error: ${JSON.stringify(data)}`);
    return;
  }

  // Разрешённые origin'ы (для безопасности). На время дебага оставим '*'.
  const allowed = (OAUTH_ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const targetOrigin = allowed.includes(state) ? state : "*";

  // Отправляем ВСЕ популярные варианты сообщений,
  // чтобы Decap CMS точно поймал одно из них:
  const token = JSON.stringify(data.access_token);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html><body><script>
    (function(){
      try {
        var t = ${token};
        var origin = ${JSON.stringify(targetOrigin)};
        // 1) Новый формат: объект
        if (window.opener) {
          window.opener.postMessage({ token: t, provider: "github" }, origin);
        }
        // 2) Старый формат Decap/Netlify CMS (строка)
        if (window.opener) {
          window.opener.postMessage("authorization:github:success:" + t, origin);
        }
        // 3) Ещё один объектный формат
        if (window.opener) {
          window.opener.postMessage({ type: "authorization_response", token: t }, origin);
        }
        // Закрываем попап
        if (window.opener) window.close();
        else document.body.innerText = "Token: " + t;
      } catch (e) {
        document.body.innerText = "PostMessage error: " + (e && e.message ? e.message : e);
      }
    })();
  </script></body></html>`);
};

