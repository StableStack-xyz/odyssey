export const handler = async (event) => {
  const url = new URL(event.rawUrl);
  const queryString = url.search ?? '';

  // 1. Check for upstream internal-middleware gateway
  const gatewayUrl = (
    process.env.INTERNAL_MIDDLEWARE_URL ||
    process.env.VITE_REACT_APP_GATEWAY_URL ||
    ''
  ).replace(/\/+$/, '');

  let targetUrl;
  let injectInternalSecret = false;

  if (gatewayUrl) {
    // internal-middleware expects the full path starting with /api/...
    // (e.g. /api/auth/*, /api/wallet/*, /api/base/*, /api/identity/*)
    targetUrl = `${gatewayUrl}${url.pathname}${queryString}`;
  } else {
    // Fallback: Legacy direct service routing if gateway is not yet configured
    let path = url.pathname.replace(/^\/api/, '');
    if (!path.startsWith('/')) path = '/' + path;

    let baseUrl;
    let apiPath;

    if (path.startsWith('/wallet')) {
      baseUrl = process.env.VITE_REACT_APP_WALLET_BASE_URL;
      apiPath = path.replace('/wallet', '');
      injectInternalSecret = true;
    } else if (path.startsWith('/auth')) {
      baseUrl = process.env.VITE_REACT_APP_AUTH_BASE_URL;
      apiPath = path.replace('/auth', '');
    } else if (path.startsWith('/base')) {
      baseUrl = process.env.VITE_REACT_APP_BASE_URL;
      apiPath = path.replace('/base', '');
    } else if (path.startsWith('/identity')) {
      baseUrl = process.env.VITE_REACT_APP_IDENTITY_BASE_URL || 'http://localhost:4040';
      apiPath = path.replace('/identity', '');
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `No match for path: ${path}` }),
      };
    }

    targetUrl = `${baseUrl}${apiPath}${queryString}`;
  }

  try {
    const incomingContentType =
      event.headers['content-type'] || event.headers['Content-Type'] || '';
    const isMultipart = incomingContentType.startsWith('multipart/form-data');

    let forwardBody;
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
      forwardBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }

    const headers = {
      ...(isMultipart
        ? { 'Content-Type': incomingContentType }
        : { 'Content-Type': 'application/json' }),
      ...(event.headers['authorization'] && {
        Authorization: event.headers['authorization'],
      }),
      ...(event.headers['origin'] && {
        Origin: event.headers['origin'],
      }),
      ...(event.headers['referer'] && {
        Referer: event.headers['referer'],
      }),
      ...(event.headers['x-request-id'] && {
        'x-request-id': event.headers['x-request-id'],
      }),
    };

    if (injectInternalSecret && process.env.WALLET_SERVICE_SECRET) {
      headers['x-internal-secret'] = process.env.WALLET_SERVICE_SECRET;
    }

    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers,
      ...(forwardBody !== undefined ? { body: forwardBody } : {}),
    });

    // SSE / streaming endpoints — proxy raw body without JSON parsing
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const body = await response.text();
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': contentType || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Conversation-ID': response.headers.get('x-conversation-id') || '',
        },
        body,
      };
    }

    const data = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('FETCH ERROR:', err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach backend', detail: err.message }),
    };
  }
};
