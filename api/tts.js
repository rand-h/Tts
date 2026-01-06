const { MsEdgeTTS, OUTPUT_FORMAT } = require("ms-edge-tts");
const ALLOWED_ORIGIN = "*"; 

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text, voice } = req.body || {};
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice || "fr-FR-DeniseNeural", 
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );
    const audioStream = await tts.toStream(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    audioStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
