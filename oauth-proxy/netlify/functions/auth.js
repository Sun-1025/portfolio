// Netlify Function: /api/auth -> 302 to GitHub OAuth authorize
// Env: GITHUB_CLIENT_ID
exports.handler = async (event) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, body: 'Missing GITHUB_CLIENT_ID' };
  }
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const proto = event.headers['x-forwarded-proto'] || 'https';
  // GitHub OAuth App 注册的回调地址就是 /api/callback，此处保持一致
  const redirectUri = `${proto}://${host}/api/callback`;
  const url =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&scope=repo%2Cuser';
  return { statusCode: 302, headers: { Location: url } };
};
