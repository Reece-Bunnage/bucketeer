const HOSTS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

export function plaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

// Plaid is plain JSON-over-HTTPS with the client id + secret in the body,
// so a thin fetch wrapper keeps us dependency-free.
export async function plaidRequest(apiPath, body = {}) {
  const host = HOSTS[process.env.PLAID_ENV || 'sandbox'] || HOSTS.sandbox;
  const res = await fetch(host + apiPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(`Plaid API error: ${json.error_message || res.status}`), {
      status: res.status,
    });
  }
  return json;
}
