/**
 * Real outbound email delivery endpoint.
 *
 * Previously every "email" in this app was purely simulated in the browser
 * (an in-app toast + a fake SMTP log) — nothing was ever actually sent, which
 * is why account-creation, update, and password-reset emails never reached
 * anyone's inbox. This serverless function sends the message for real via
 * Resend (https://resend.com) and is called by
 * `src/utils/emailAndDownloadService.ts` every time the app dispatches an
 * email notification.
 *
 * REQUIRED SETUP (do this once, in the Vercel project dashboard):
 *   1. Create a free Resend account: https://resend.com/signup
 *   2. Verify a sending domain (or use their shared test domain while testing).
 *   3. Create an API key: https://resend.com/api-keys
 *   4. In Vercel: Project Settings -> Environment Variables, add:
 *        RESEND_API_KEY   = re_xxxxxxxxxxxxxxxxxxxx
 *        RESEND_FROM_EMAIL= EnterprizSeat <no-reply@yourdomain.com>
 *   5. Redeploy. Until RESEND_API_KEY is set, this endpoint responds with
 *      sent:false and a clear reason instead of throwing, so the app keeps
 *      working (emails just stay in-app-only, same as before) until the key
 *      is configured.
 */

export const config = { runtime: "edge" };

interface SendEmailRequestBody {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ sent: false, reason: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body: SendEmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ sent: false, reason: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { to, subject, html, text, replyTo, cc } = body || {};
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ sent: false, reason: "Missing to, subject, or html" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "EnterprizSeat <onboarding@resend.dev>";

  if (!apiKey) {
    // Not configured yet — fail soft so the UI doesn't break, but tell the caller why.
    return new Response(
      JSON.stringify({
        sent: false,
        reason: "RESEND_API_KEY is not configured on the server. Add it in Vercel Project Settings -> Environment Variables, then redeploy."
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        cc: cc ? [cc] : undefined,
        reply_to: replyTo,
        subject,
        html,
        text: text || undefined
      })
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      return new Response(JSON.stringify({ sent: false, reason: `Resend API error: ${errText}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await resendResponse.json();
    return new Response(JSON.stringify({ sent: true, id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ sent: false, reason: err?.message || "Unknown error sending email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
