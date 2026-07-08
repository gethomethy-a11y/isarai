// Vercel Serverless Function
// Pfad im Repo:  /api/retell-chat.js
//
// Diese Funktion ist die Brücke zwischen dem eigenen Chat-Modal (index.html)
// und der Retell Chat-API. Der geheime Retell-API-Key bleibt auf dem Server.
//
// Zwei Aktionen:
//   { action: "start" }                          -> neue Chat-Session, gibt chat_id zurück
//   { action: "message", chat_id, content }      -> Nachricht senden, gibt Agent-Antwort(en) zurück

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RETELL_API_KEY = process.env.RETELL_API_KEY;       // gleiche Env-Var wie beim Voice-Agent
  const CHAT_AGENT_ID = process.env.RETELL_CHAT_AGENT_ID
    || 'agent_80f97c616a3faf7d6cc0dab99c';                 // Fallback: dein Chat-Agent

  if (!RETELL_API_KEY) {
    return res.status(500).json({ error: 'RETELL_API_KEY nicht konfiguriert' });
  }

  const { action, chat_id, content } = req.body || {};

  try {
    // ── Aktion 1: neue Chat-Session starten ──
    if (action === 'start') {
      const r = await fetch('https://api.retellai.com/create-chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent_id: CHAT_AGENT_ID }),
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Retell API error (create-chat)', detail: text });
      }

      const data = await r.json();
      return res.status(200).json({ chat_id: data.chat_id });
    }

    // ── Aktion 2: Nachricht senden, Antwort holen ──
    if (action === 'message') {
      if (!chat_id || !content) {
        return res.status(400).json({ error: 'chat_id und content erforderlich' });
      }

      const r = await fetch('https://api.retellai.com/create-chat-completion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: chat_id, content: String(content).slice(0, 2000) }),
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Retell API error (chat-completion)', detail: text });
      }

      const data = await r.json();
      // Nur die Agent-Nachrichten extrahieren und zurückgeben.
      const messages = (data.messages || [])
        .filter(function (m) { return m.role === 'agent' && m.content; })
        .map(function (m) { return m.content; });

      return res.status(200).json({ messages: messages });
    }

    return res.status(400).json({ error: 'Unbekannte action (erlaubt: start, message)' });
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler', detail: String(err) });
  }
}
