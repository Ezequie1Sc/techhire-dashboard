const translate = require('google-translate-api-x');

const MAX_CHUNK_SIZE = 900;

/**
 * Divide textos largos en bloques para evitar
 * errores de Google Translate con descripciones extensas.
 */
function splitText(text) {
  const cleanText = String(text || '').trim();

  const paragraphs = cleanText
    .split(/\n+/)
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > MAX_CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += '\n' + paragraph;
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

    if (!text) {
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
      translatedText: translatedChunks.join('\n\n')
    });

  } catch (error) {
    console.error('Error Translate:', error);

    return res.status(500).json({
      error: error.message || 'Error al traducir'
    });
  }
};