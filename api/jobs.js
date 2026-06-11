const https = require('https');

module.exports = async function handler(req, res) {
  // Headers CORS para permitir requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const page = Math.max(1, Number(req.query?.page || 1));
    const perPage = 20;

    // Ejecutar ambas APIs en paralelo con manejo de errores
    const [adzunaResult, remotiveResult] = await Promise.allSettled([
      fetchAdzunaJobs(page, perPage),
      fetchRemotiveJobs()
    ]);

    const adzunaJobs = adzunaResult.status === 'fulfilled' ? adzunaResult.value : [];
    const remotiveJobs = remotiveResult.status === 'fulfilled' ? remotiveResult.value : [];

    console.log(`[JOBS API] Adzuna: ${adzunaJobs.length}, Remotive: ${remotiveJobs.length}`);

    // Combinar y limpiar duplicados
    const allJobs = removeDuplicates([...adzunaJobs, ...remotiveJobs]);

    // Paginación
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedJobs = allJobs.slice(start, end);
    const totalPages = Math.max(1, Math.ceil(allJobs.length / perPage));

    return res.status(200).json({
      success: true,
      data: paginatedJobs,
      pagination: {
        current_page: page,
        per_page: perPage,
        total: allJobs.length,
        total_pages: totalPages,
        from: allJobs.length > 0 ? start + 1 : 0,
        to: allJobs.length > 0 ? Math.min(end, allJobs.length) : 0
      },
      links: {
        first: '/api/jobs?page=1',
        last: `/api/jobs?page=${totalPages}`,
        prev: page > 1 ? `/api/jobs?page=${page - 1}` : null,
        next: page < totalPages ? `/api/jobs?page=${page + 1}` : null
      },
      metadata: {
        sources: {
          adzuna: {
            status: adzunaResult.status,
            count: adzunaJobs.length,
            error: adzunaResult.status === 'rejected' ? adzunaResult.reason?.message : null
          },
          remotive: {
            status: remotiveResult.status,
            count: remotiveJobs.length,
            error: remotiveResult.status === 'rejected' ? remotiveResult.reason?.message : null
          }
        },
        combined_total: allJobs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[JOBS API] Fatal error:', error);

    return res.status(500).json({
      success: false,
      error: 'Error al obtener empleos',
      data: [],
      pagination: {
        current_page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
        from: 0,
        to: 0
      },
      links: {
        first: null,
        last: null,
        prev: null,
        next: null
      },
      metadata: {
        error_details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Obtiene empleos de Adzuna (México - LATAM)
 */
async function fetchAdzunaJobs(page, perPage) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('ADZUNA_APP_ID o ADZUNA_APP_KEY no configuradas');
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
    `?app_id=${appId}` +
    `&app_key=${appKey}` +
    `&results_per_page=${perPage}` +
    `&what=developer`;

  try {
    const result = await fetchJson(url);

    if (!Array.isArray(result.results)) {
      throw new Error('Respuesta inválida de Adzuna');
    }

    return result.results.map((job) => {
      const title = job.title || 'Vacante sin título';
      const company = job.company?.display_name || 'Empresa no especificada';
      const location = job.location?.display_name || 'México';
      const uniqueId = `adzuna-${job.id}`;

      return {
        id: uniqueId,
        slug: generateSlug(uniqueId, title),
        title: title.trim(),
        company_name: company.trim(),
        location: location.trim(),
        source: 'adzuna',
        region: 'LATAM',
        remote: isRemote(job),
        url: job.redirect_url || '',
        description: (job.description || '').slice(0, 1000),
        salary: job.salary_min
          ? {
              min: job.salary_min,
              max: job.salary_max || null,
              currency: 'MXN'
            }
          : null,
        tags: buildAdzunaTags(job),
        job_type: job.category?.label || 'General',
        created_at: job.created
          ? Math.floor(new Date(job.created).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
    });
  } catch (error) {
    console.error('[ADZUNA] Error:', error.message);
    throw error;
  }
}

/**
 * Obtiene empleos de Remotive (Europa/Global - Remote)
 */
async function fetchRemotiveJobs() {
  try {
    const result = await fetchJson('https://remotive.com/api/remote-jobs');

    if (!Array.isArray(result.jobs)) {
      throw new Error('Respuesta inválida de Remotive');
    }

    // Tomar empleos remotos para developers/tech
    return result.jobs
      .filter((job) => {
        const category = (job.category || '').toLowerCase();
        return (
          category.includes('software') ||
          category.includes('developer') ||
          category.includes('engineer') ||
          category.includes('devops') ||
          category.includes('data')
        );
      })
      .slice(0, 50)
      .map((job) => {
        const title = job.title || 'Vacante sin título';
        const id = job.id || Math.random().toString(36).slice(2, 11);
        const uniqueId = `remotive-${id}`;

        return {
          id: uniqueId,
          slug: generateSlug(uniqueId, title),
          title: title.trim(),
          company_name: (job.company_name || 'Empresa no especificada').trim(),
          location: job.candidate_required_location || 'Remote',
          source: 'remotive',
          region: 'Global/Europa',
          remote: true,
          url: job.url || '',
          description: (job.description || '').slice(0, 1000),
          salary: null, // Remotive no proporciona salary
          tags: Array.isArray(job.tags) ? job.tags.slice(0, 5) : [],
          job_type: job.job_type || 'Remote',
          created_at: job.publication_date
            ? Math.floor(new Date(job.publication_date).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        };
      });
  } catch (error) {
    console.error('[REMOTIVE] Error:', error.message);
    throw error;
  }
}

/**
 * Realiza request HTTPS y parsea JSON
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; JobSearchBot/1.0)'
          },
          timeout: 10000
        },
        (response) => {
          let data = '';

          // Validar status code
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`JSON inválido: ${data.slice(0, 100)}`));
            }
          });
        }
      )
      .on('error', reject)
      .on('timeout', () => {
        reject(new Error('Timeout en request'));
      });
  });
}

/**
 * Detecta si un empleo es remoto
 */
function isRemote(job) {
  const text = `${job.title || ''} ${job.description || ''} ${
    job.location?.display_name || ''
  }`.toLowerCase();

  return (
    text.includes('remote') ||
    text.includes('remoto') ||
    text.includes('home office') ||
    text.includes('trabajo desde casa') ||
    text.includes('trabajo remoto') ||
    text.includes('híbrido')
  );
}

/**
 * Construye tags para empleos de Adzuna
 */
function buildAdzunaTags(job) {
  const tags = new Set();

  if (job.category?.label) tags.add(job.category.label);
  if (job.location?.display_name) tags.add(job.location.display_name);
  if (isRemote(job)) tags.add('Remoto');
  tags.add('México');

  // Agregar tags de salary si existe
  if (job.salary_min) tags.add('Con Salario');

  return Array.from(tags).slice(0, 6);
}

/**
 * Elimina duplicados comparando titulo, empresa y descripción
 */
function removeDuplicates(jobs) {
  const seen = new Map();
  const deduped = [];

  for (const job of jobs) {
    // Crear key basado en titulo y empresa
    const key = `${job.title.toLowerCase().slice(0, 50)}-${job.company_name
      .toLowerCase()
      .slice(0, 40)}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      deduped.push(job);
    }
  }

  // Ordenar por fecha de creación (más recientes primero)
  return deduped.sort((a, b) => b.created_at - a.created_at);
}

/**
 * Genera slug único a partir de ID y título
 */
function generateSlug(id, title) {
  const cleanTitle = String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);

  return `${id}-${cleanTitle}`.slice(0, 80);
}