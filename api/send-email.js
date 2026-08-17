// api/send-email.js - Vercel / Netlify serverless function for sending emails via Resend
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html } = req.body || {};

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required parameters (to, subject, html)' });
    }

    const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || '';
    const sender = process.env.VITE_RESEND_FROM || process.env.RESEND_FROM || 'nahid <expenses@nextpostmedia.com>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Serverless send-email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
