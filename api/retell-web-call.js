// Vercel Serverless Function
// Pfad im Repo:  /api/retell-web-call.js
//
// Diese Funktion erzeugt pro Anruf einen kurzlebigen Access-Token.
// Der geheime Retell-API-Key bleibt auf dem Server (Environment Variable),
// er darf NIEMALS im Browser/HTML stehen.
//
// Aufgerufen wird sie automatisch vom Voice-Modal in index.html
// (TOKEN_ENDPOINT = '/api/retell-web-call').

export default async function handler(req, res) {
  // Nur POST erlauben
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RETELL_API_KEY = process.env.RETELL_API_KEY;      // <- als Vercel-Secret setzen
  const AGENT_ID = process.env.RETELL_AGENT_ID
    || 'agent_869d3fcb302ec68b6b63a315cb';                // Fallback: dein Voice-Agent

  if (!RETELL_API_KEY) {
    return res.status(500).json({ error: 'RETELL_API_KEY nicht konfiguriert' });
  }

  try {
    const r = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Retell API error', detail: text });
    }

    const data = await r.json();
    // Nur den Token an den Browser geben – sonst nichts Sensibles.
    return res.status(200).json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler', detail: String(err) });
  }
}
