import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function resolveEnvPath(p) {
  return path.isAbsolute(p) ? p : path.resolve(serverRoot, p);
}

/**
 * Call the Teller API.
 *
 * Teller authenticates with HTTP Basic auth where the username is the user's
 * access token (obtained in the browser via Teller Connect and passed to us
 * per-request — the server never stores it). Outside the sandbox, Teller
 * additionally requires mutual TLS with the client certificate + private key
 * downloaded from the Teller dashboard.
 */
export function tellerRequest(apiPath, accessToken) {
  const env = process.env.TELLER_ENVIRONMENT || 'sandbox';
  const options = {
    hostname: 'api.teller.io',
    path: apiPath,
    method: 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accessToken}:`).toString('base64'),
      Accept: 'application/json',
    },
  };
  if (env !== 'sandbox') {
    options.cert = fs.readFileSync(resolveEnvPath(process.env.TELLER_CERT_PATH));
    options.key = fs.readFileSync(resolveEnvPath(process.env.TELLER_KEY_PATH));
  }
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(
            Object.assign(new Error(`Teller API error ${res.statusCode}: ${body}`), {
              status: res.statusCode,
            })
          );
        } else {
          try {
            resolve(JSON.parse(body || 'null'));
          } catch {
            reject(new Error('Teller returned a non-JSON response'));
          }
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
