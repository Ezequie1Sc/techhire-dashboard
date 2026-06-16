const TRANSLATE_URL =
  process.env.TRANSLATE_URL || 'https://libretranslate.com/translate';

async function translateText(text, target = 'es') {
  if (!text || typeof text !== 'string') {
    throw new Error('Texto requerido');
  }

  if (!['es', 'en'].includes(target)) {
    throw new Error('Idioma no permitido');
  }

  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Jobly'
    },
    body: JSON.stringify({
      q: text,
      source: 'auto',
      target,
      format: 'html'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `LibreTranslate HTTP ${response.status}`);
  }

  return data.translatedText || '';
}

module.exports = {
  translateText
};