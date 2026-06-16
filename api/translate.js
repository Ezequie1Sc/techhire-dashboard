const { translateText } = require('./services/translate.service');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  try {
    const { text, target = 'es' } = req.body || {};

    const translatedText = await translateText(text, target);

    return res.status(200).json({
      translatedText
    });
  } catch (error) {
    return res.status(500).json({
      error: String(error.message || error)
    });
  }
};