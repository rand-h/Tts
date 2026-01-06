const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// SÉCURITÉ CORS
const ALLOWED_ORIGIN = "*"; // Remplace par l'URL de ton site en prod

module.exports = async (req, res) => {
  // --- Headers CORS ---
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text, voice } = req.body || {};
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  try {
    // On génère l'audio via WebSocket manuel
    const audioBuffer = await generateAudio(text, voice || "fr-FR-DeniseNeural");
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error("Erreur TTS:", error);
    res.status(500).json({ error: "Erreur de génération : " + error.message });
  }
};

// --- FONCTION MAGIQUE (Celle qui remplace la librairie) ---
function generateAudio(text, voice) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4-EA85-432F-9283-4188F96023FA");
    const requestId = uuidv4();
    let audioData = [];

    ws.on('open', () => {
      // 1. Config du format audio
      ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
      
      // 2. Envoi du texte (SSML)
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%'>${text}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // On sépare l'en-tête du contenu audio
        const separator = "Path:audio\r\n";
        const index = data.indexOf(separator);
        if (index >= 0) {
          audioData.push(data.slice(index + separator.length));
        }
      } else {
        // Message texte (fin de tour)
        const msg = data.toString();
        if (msg.includes("Path:turn.end")) {
          ws.close();
        }
      }
    });

    ws.on('close', () => resolve(Buffer.concat(audioData)));
    ws.on('error', (err) => reject(err));
  });
}
