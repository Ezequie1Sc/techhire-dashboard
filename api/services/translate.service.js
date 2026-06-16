const TRANSLATE_URL =
  process.env.TRANSLATE_URL || 'https://libretranslate.com/translate';

async function translateText(text, target = 'es') {
  if (!text || typeof text !== 'string') {
    throw new Error('Texto requerido');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(TRANSLATE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target,
        format: 'text'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Error ${response.status}`);
    }

    return data.translatedText || '';
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  translateText
};