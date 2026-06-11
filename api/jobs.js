const https = require('https');

module.exports = async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1);
    const perPage = 20;

    const appId = process.env.ADZUNA_APP_ID || '921dd9a0';
    const appKey = process.env.ADZUNA_APP_KEY || 'TU_APP_KEY_AQUI';

    const url =
      `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
      `?app_id=${appId}` +
      `&app_key=${appKey}` +
      `&results_per_page=${perPage}` +
      `&what=developer`;

    const result = await fetchJson(url);
    const jobs = Array.isArray(result.results) ? result.results : [];

    const mappedJobs = jobs.map((job) => {
      const title = job.title || 'Vacante sin título';

      return {
        slug: `${job.id}-${slugify(title)}`,
        title,
        company_name: job.company?.display_name || 'Empresa no especificada',
        location: job.location?.display_name || 'México',
        remote: isRemote(job),
        url: job.redirect_url || '',
        description: job.description || '',
        tags: buildTags(job),
        job_types: [job.category?.label || 'General'],
        created_at: job.created
          ? Math.floor(new Date(job.created).getTime() / 1000)
          : Math.floor(Date.now() / 1000)
      };
    });

    const total = result.count || mappedJobs.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    return res.status(200).json({
      data: mappedJobs,
      links: {
        first: '/api/jobs?page=1',
        last: `/api/jobs?page=${lastPage}`,
        prev: page > 1 ? `/api/jobs?page=${page - 1}` : null,
        next: page < lastPage ? `/api/jobs?page=${page + 1}` : null
      },
      meta: {
        current_page: page,
        from: mappedJobs.length ? (page - 1) * perPage + 1 : 0,
        last_page: lastPage,
        path: '/api/jobs',
        per_page: perPage,
        to: (page - 1) * perPage + mappedJobs.length,
        total
      }
    });
  } catch (error) {
    console.error('API /api/jobs error:', error);
    return res.status(200).json(emptyResponse());
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: 'application/json' } }, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

function buildTags(job) {
  const tags = [];

  if (job.category?.label) tags.push(job.category.label);
  if (job.location?.display_name) tags.push(job.location.display_name);
  if (isRemote(job)) tags.push('Remoto');

  return tags.slice(0, 4);
}

function isRemote(job) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location?.display_name || ''}`.toLowerCase();

  return (
    text.includes('remote') ||
    text.includes('remoto') ||
    text.includes('home office') ||
    text.includes('trabajo desde casa')
  );
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function emptyResponse() {
  return {
    data: [],
    links: {
      first: '',
      last: '',
      prev: null,
      next: null
    },
    meta: {
      current_page: 1,
      from: 0,
      last_page: 1,
      path: '',
      per_page: 0,
      to: 0,
      total: 0
    }
  };
}