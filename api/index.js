import crypto from 'node:crypto';

const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

function configurationError() {
  return !ownerEmail || !ownerPassword || !sessionSecret;
}

function parseCookies(req) {
  const out = {};

  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');

    if (i > -1) {
      out[part.slice(0, i).trim()] =
        decodeURIComponent(part.slice(i + 1).trim());
    }
  }

  return out;
}

function sign(value) {
  const sig = crypto
    .createHmac('sha256', sessionSecret)
    .update(value)
    .digest('hex');

  return `${value}.${sig}`;
}

function valid(token) {
  if (!token || !sessionSecret || !ownerEmail) return false;

  const i = token.lastIndexOf('.');

  if (i < 1) return false;

  const value = token.slice(0, i);
  const sig = token.slice(i + 1);

  const expected = crypto
    .createHmac('sha256', sessionSecret)
    .update(value)
    .digest('hex');

  if (sig.length !== expected.length) return false;

  return (
    crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    ) &&
    value.startsWith(`${ownerEmail}|`)
  );
}

function json(res, status, data) {
  res.status(status);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(data));
}

async function body(req) {
  let s = '';

  for await (const c of req) {
    s += c;
  }

  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (configurationError()) {
    return json(res, 500, {
      error:
        'SaveBasket owner authentication is not configured. Set OWNER_EMAIL, OWNER_PASSWORD and SESSION_SECRET in Vercel.'
    });
  }

  if (req.method !== 'POST') {
    return json(res, 405, {
      error: 'Method not allowed'
    });
  }

  const data = await body(req);

  if (req.url.includes('/api/login')) {
    const email = String(data.email || '').trim();
    const password = String(data.password || '');

    if (
      email.toLowerCase() !== ownerEmail.toLowerCase() ||
      password !== ownerPassword
    ) {
      return json(res, 401, {
        error: 'Invalid email or password'
      });
    }

    const token = sign(`${ownerEmail}|${Date.now()}`);

    res.setHeader(
      'set-cookie',
      `savebasket_owner=${encodeURIComponent(
        token
      )}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
    );

    return json(res, 200, {
      ok: true
    });
  }

  if (req.url.includes('/api/change-password')) {
    const cookies = parseCookies(req);

    if (!valid(cookies.savebasket_owner)) {
      return json(res, 401, {
        error: 'Owner login required'
      });
    }

    return json(res, 501, {
      error:
        'Password changes are not enabled in this deployment. Change OWNER_PASSWORD in Vercel and redeploy.'
    });
  }

  return json(res, 404, {
    error: 'Not found'
  });
}
