export default async function handler(req: any, res: any) {
  try {
    const page = req.query.page || 1;

    const response = await fetch(
      `https://remotive.com/api/remote-jobs?limit=20&page=${page}`
    );

    if (!response.ok) {
      return res.status(response.status).json({
        data: [],
        error: 'No se pudieron cargar las vacantes'
      });
    }

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      data: [],
      error: 'Error interno al cargar vacantes'
    });
  }
}