const translate = require('google-translate-api-x');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  try {
    const { text, target } = req.body;

    if (!text || !target) {
      return res.status(400).json({
        error: 'Faltan parámetros'
      });
    }

    const result = await translate(text, {
      to: target
    });

    return res.status(200).json({
      translatedText: result.text
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al traducir'
    });
  }
};