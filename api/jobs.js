const https = require('https');

module.exports = async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1);
    const perPage = 20;

    const [adzunaResult, remotiveResult] = await Promise.allSettled([
      fetchAdzunaJobs(page, perPage),
      fetchRemotiveJobs()
    ]);

    const adzunaJobs =
      adzunaResult.status === 'fulfilled' ? adzunaResult.value.jobs : [];

    const remotiveJobs =
      remotiveResult.status === 'fulfilled' ? remotiveResult.value.jobs : [];

    const allJobs = [...adzunaJobs, ...remotiveJobs];

    const uniqueJobs = removeDuplicates(allJobs);

    const start = (page - 1) * perPage;
    const paginatedJobs = uniqueJobs.slice(start, start + perPage);
    const total = uniqueJobs.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    return res.status(200).json({
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
        total
      }
    });
  } catch (error) {
    console.error('API /api/jobs error:', error);
    return res.status(200).json(emptyResponse());
  }
};

async function fetchAdzunaJobs(page, perPage) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return { jobs: [], total: 0 };
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
    `?app_id=${appId}` +
    `&app_key=${appKey}` +
    `&results_per_page=${perPage}` +
    `&what=developer`;

  const result = await fetchJson(url);
  const jobs = Array.isArray(result.results) ? result.results : [];

  return {
    total: result.count || jobs.length,
    jobs: jobs.map((job) => {
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
  const jobs = Array.isArray(result.jobs) ? result.jobs : [];

  return {
    total: jobs.length,
    jobs: jobs.map((job) => {
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
              reject(error);
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