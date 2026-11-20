interface Env {
  TURNSTILE_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const token = body.token;

    if (!token) {
      return Response.json(
        {
          success: false,
          error: 'Turnstile token is required',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const secretKey =
      env.TURNSTILE_SECRET_KEY || '0x4AAAAAAFTucwpuspGlJk3Q2i80bdtBIzs';
    const clientIp = request.headers.get('CF-Connecting-IP') || '';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    const outcome = (await verifyRes.json()) as {
      success: boolean;
      'error-codes'?: string[];
      hostname?: string;
    };

    if (!outcome.success) {
      return Response.json(
        {
          success: false,
          error: 'Turnstile verification failed',
          details: outcome['error-codes'],
        },
        { status: 403, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        success: true,
        hostname: outcome.hostname,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || 'Internal error',
      },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
