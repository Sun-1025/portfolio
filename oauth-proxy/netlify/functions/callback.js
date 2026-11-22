// Netlify Function: /api/callback -> exchange code for token, hand it to Decap CMS
// Env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
exports.handler = async (event) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const q = event.queryStringParameters || {};
  const code = q.code;

  if (!code) return { statusCode: 400, body: 'Missing code' };
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: 'Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET' };
  }

  let token = '';
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await r.json();
    token = (data && data.access_token) || '';
  } catch (e) {
    token = '';
  }

  const status = token ? 'success' : 'error';
  const payload = JSON.stringify({ token, provider: 'github' });
  const message = `authorization:github:${status}:${payload}`;

  const body = `<!doctype html>
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
    document.body.innerHTML = '<p>Login window lost its opener. Close this tab and retry from /admin/.</p>';
  }
})();
</script>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body };
};
