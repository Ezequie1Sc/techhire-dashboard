const translate = require('google-translate-api-x');

const MAX_CHUNK_SIZE = 800;

function cleanText(text) {
  return String(text || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function splitText(text) {
  const clean = cleanText(text);

  if (!clean) return [];

  const words = clean.split(/\s+/);
  const chunks = [];

  let currentChunk = '';

  for (const word of words) {
    const nextChunk = `${currentChunk} ${word}`.trim();

    if (nextChunk.length > MAX_CHUNK_SIZE) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      currentChunk = word;
    } else {
      currentChunk = nextChunk;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  try {
    const { text, target } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        error: 'Texto requerido'
      });
    }

    if (!target) {
      return res.status(400).json({
        error: 'Idioma requerido'
      });
    }

    const chunks = splitText(text);

    const translatedChunks = [];

    for (const chunk of chunks) {
      const result = await translate(chunk, {
        to: target
      });

      translatedChunks.push(result.text);
    }

    return res.status(200).json({
      translatedText: translatedChunks.join(' ')
    });

  } catch (error) {
    console.error('Error Translate:', error);

    return res.status(500).json({
      error: error.message || 'Error al traducir'
    });
  }
};