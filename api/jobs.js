module.exports = async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1);
    const perPage = 20;

    const [adzunaResult, remotiveResult] = await Promise.allSettled([
      getAdzunaJobs(page, perPage),
      getRemotiveJobs()
    ]);

    const adzunaJobs =
      adzunaResult.status === 'fulfilled' ? adzunaResult.value : [];

    const remotiveJobs =
      remotiveResult.status === 'fulfilled' ? remotiveResult.value : [];

    const allJobs = [...adzunaJobs, ...remotiveJobs];

    return res.status(200).json({
      debug: {
        adzuna: adzunaJobs.length,
        remotive: remotiveJobs.length,
        total: allJobs.length
      },
      data: allJobs,
      links: {
        first: '/api/jobs?page=1',
        last: '/api/jobs?page=1',
        prev: null,
        next: null
      },
      meta: {
        current_page: page,
        from: allJobs.length ? 1 : 0,
        last_page: 1,
        path: '/api/jobs',
        per_page: perPage,
        to: allJobs.length,
        total: allJobs.length
      }
    });
  } catch (error) {
    return res.status(200).json({
      debug: {
        error: String(error)
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

async function getAdzunaJobs(page, perPage) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Faltan ADZUNA_APP_ID o ADZUNA_APP_KEY');
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
    `?app_id=${appId}` +
    `&app_key=${appKey}` +
    `&results_per_page=${perPage}` +
    `&what=developer`;

  const response = await fetch(url);
  const result = await response.json();

  const jobs = Array.isArray(result.results) ? result.results : [];

  return jobs.map((job) => {
    const title = job.title || 'Vacante sin título';

    return {
      slug: `adzuna-${job.id}-${slugify(title)}`,
      title,
      company_name: job.company?.display_name || 'Empresa no especificada',
      location: job.location?.display_name || 'México',
      remote: isRemote(job),
      url: job.redirect_url || '',
      description: job.description || '',
      tags: [
        job.category?.label || 'México',
        job.location?.display_name || 'México',
        'Adzuna'
      ],
      job_types: [job.category?.label || 'General'],
      created_at: job.created
        ? Math.floor(new Date(job.created).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
    };
  });
}

async function getRemotiveJobs() {
  const response = await fetch('https://remotive.com/api/remote-jobs');
  const result = await response.json();

  const jobs = Array.isArray(result.jobs) ? result.jobs.slice(0, 20) : [];

  return jobs.map((job) => {
    const title = job.title || 'Vacante sin título';

    return {
      slug: `remotive-${job.id}-${slugify(title)}`,
      title,
      company_name: job.company_name || 'Empresa no especificada',
      location: job.candidate_required_location || 'Remote',
      remote: true,
      url: job.url || '',
      description: job.description || '',
      tags: Array.isArray(job.tags) ? [...job.tags.slice(0, 3), 'Remotive'] : ['Remotive'],
      job_types: job.job_type ? [job.job_type] : ['Remote'],
      created_at: job.publication_date
        ? Math.floor(new Date(job.publication_date).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
    };
  });
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