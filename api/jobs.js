const https = require('https');

module.exports = async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1);
    const perPage = 20;

    const [adzuna, remotive] = await Promise.allSettled([
      fetchAdzunaJobs(page, perPage),
      fetchRemotiveJobs()
    ]);

    const adzunaJobs = adzuna.status === 'fulfilled' ? adzuna.value.jobs : [];
    const remotiveJobs = remotive.status === 'fulfilled' ? remotive.value.jobs : [];

    const allJobs = removeDuplicates([...adzunaJobs, ...remotiveJobs]);

    const start = (page - 1) * perPage;
    const paginatedJobs = allJobs.slice(start, start + perPage);
    const lastPage = Math.max(1, Math.ceil(allJobs.length / perPage));

    return res.status(200).json({
      debug: {
        adzuna_status: adzuna.status,
        adzuna_count: adzunaJobs.length,
        adzuna_error: adzuna.status === 'rejected' ? String(adzuna.reason) : null,
        remotive_status: remotive.status,
        remotive_count: remotiveJobs.length,
        remotive_error: remotive.status === 'rejected' ? String(remotive.reason) : null,
        total_combined: allJobs.length
      },
      data: paginatedJobs,
      links: {
        first: '/api/jobs?page=1',
        last: `/api/jobs?page=${lastPage}`,
        prev: page > 1 ? `/api/jobs?page=${page - 1}` : null,
        next: page < lastPage ? `/api/jobs?page=${page + 1}` : null
      },
      meta: {
        current_page: page,
        from: paginatedJobs.length ? start + 1 : 0,
        last_page: lastPage,
        path: '/api/jobs',
        per_page: perPage,
        to: start + paginatedJobs.length,
        total: allJobs.length
      }
    });
  } catch (error) {
    return res.status(200).json({
      debug: {
        fatal_error: String(error)
      },
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
    });
  }
};

async function fetchAdzunaJobs(page, perPage) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Faltan variables ADZUNA_APP_ID o ADZUNA_APP_KEY');
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
    `?app_id=${appId}` +
    `&app_key=${appKey}` +
    `&results_per_page=${perPage}` +
    `&what=developer`;

  const result = await fetchJson(url);

  if (!Array.isArray(result.results)) {
    throw new Error(`Adzuna no devolvió results: ${JSON.stringify(result).slice(0, 200)}`);
  }

  return {
    jobs: result.results.map((job) => {
      const title = job.title || 'Vacante sin título';

      return {
        slug: `adzuna-${job.id}-${slugify(title)}`,
        title,
        company_name: job.company?.display_name || 'Empresa no especificada',
        location: job.location?.display_name || 'México',
        remote: isRemote(job),
        url: job.redirect_url || '',
        description: job.description || '',
        tags: buildAdzunaTags(job),
        job_types: [job.category?.label || 'General'],
        created_at: job.created
          ? Math.floor(new Date(job.created).getTime() / 1000)
          : Math.floor(Date.now() / 1000)
      };
    })
  };
}

async function fetchRemotiveJobs() {
  const result = await fetchJson('https://remotive.com/api/remote-jobs');

  if (!Array.isArray(result.jobs)) {
    throw new Error(`Remotive no devolvió jobs: ${JSON.stringify(result).slice(0, 200)}`);
  }

  return {
    jobs: result.jobs.slice(0, 40).map((job) => {
      const title = job.title || 'Vacante sin título';
      const id = job.id || Math.random().toString(36).slice(2);

      return {
        slug: `remotive-${id}-${slugify(title)}`,
        title,
        company_name: job.company_name || 'Empresa no especificada',
        location: job.candidate_required_location || 'Remote',
        remote: true,
        url: job.url || '',
        description: job.description || '',
        tags: Array.isArray(job.tags) ? job.tags.slice(0, 4) : [],
        job_types: job.job_type ? [job.job_type] : ['Remote'],
        created_at: job.publication_date
          ? Math.floor(new Date(job.publication_date).getTime() / 1000)
          : Math.floor(Date.now() / 1000)
      };
    })
  };
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Jobly'
          }
        },
        (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`No se pudo parsear JSON: ${data.slice(0, 200)}`));
            }
          });
        }
      )
      .on('error', reject);
  });
}

function buildAdzunaTags(job) {
  const tags = [];

  if (job.category?.label) tags.push(job.category.label);
  if (job.location?.display_name) tags.push(job.location.display_name);
  if (isRemote(job)) tags.push('Remoto');
  tags.push('México');

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

function removeDuplicates(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const key = `${job.company_name}-${job.title}`.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}