// Step 1: redirect the CMS popup to GitHub's OAuth authorize page.
// Env: GITHUB_CLIENT_ID
export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing GITHUB_CLIENT_ID');
    return;
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;
  const authorizeUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&scope=repo%2Cuser';
  res.writeHead(302, { Location: authorizeUrl });
  res.end();
}
