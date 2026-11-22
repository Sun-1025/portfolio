// Step 2: GitHub redirects here with ?code=...; exchange it for a token
// and hand the token back to the Decap CMS opener window.
// Env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const code = req.query && req.query.code;

  if (!code) {
    res.status(400).send('Missing code');
    return;
  }
  if (!clientId || !clientSecret) {
    res.status(500).send('Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET');
    return;
  }

  let token = '';
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = await r.json();
    token = (data && data.access_token) || '';
  } catch (e) {
    token = '';
  }

  const status = token ? 'success' : 'error';
  const payload = JSON.stringify({ token, provider: 'github' });
  const message = `authorization:github:${status}:${payload}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Authorizing…</title></head>
<body>
<script>
(function () {
  var message = ${JSON.stringify(message)};
  function receive(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  if (window.opener) {
    window.opener.postMessage('authorizing:github', '*');
  } else {
    document.body.innerHTML = '<p>Login window lost its opener. Close this tab and try again from /admin/.</p>';
  }
})();
</script>
</body></html>`);
}
