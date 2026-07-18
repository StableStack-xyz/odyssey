exports.handler = async (event) => {
  const url = new URL(event.rawUrl);

  // This now gives you /api/auth/users/auth/signin
  let path = url.pathname.replace(/^\/api/, '');

  if (!path.startsWith('/')) path = '/' + path;

  const queryString = url.search ?? '';

  let baseUrl;
  let apiPath;

  if (path.startsWith('/wallet')) {
    baseUrl = process.env.VITE_REACT_APP_WALLET_BASE_URL;
    apiPath = path.replace('/wallet', '');
  } else if (path.startsWith('/auth')) {
    baseUrl = process.env.VITE_REACT_APP_AUTH_BASE_URL;
    apiPath = path.replace('/auth', '');
  } else if (path.startsWith('/base')) {
    baseUrl = process.env.VITE_REACT_APP_BASE_URL;
    apiPath = path.replace('/base', '');
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `No match for path: ${path}` })
    };
  }

  const targetUrl = `${baseUrl}/api${apiPath}${queryString}`;

  try {
    const incomingContentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const isMultipart = incomingContentType.startsWith('multipart/form-data');

    let forwardBody;
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
      forwardBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }

    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'x-internal-secret': process.env.WALLET_SERVICE_SECRET,
        ...(isMultipart
          ? { 'Content-Type': incomingContentType }
          : { 'Content-Type': 'application/json' }),
        ...(event.headers['authorization'] && {
          'Authorization': event.headers['authorization'],
        }),
      },
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
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('FETCH ERROR:', err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach backend', detail: err.message })
    };
  }
};
