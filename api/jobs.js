module.exports = async function handler(req, res) {
  try {
    const adzunaPages = [1, 2, 3];
    const arbeitnowPages = [1, 2, 3, 4];

    const [adzunaResult, arbeitnowResult] = await Promise.allSettled([
      getAdzunaJobs(adzunaPages),
      getArbeitnowJobs(arbeitnowPages)
    ]);

    const adzunaJobs =
      adzunaResult.status === 'fulfilled' ? adzunaResult.value : [];

    const arbeitnowJobs =
      arbeitnowResult.status === 'fulfilled' ? arbeitnowResult.value : [];

    const allJobs = removeDuplicates([...adzunaJobs, ...arbeitnowJobs]);
    const total = allJobs.length;

    return res.status(200).json({
      debug: {
        adzuna_count: adzunaJobs.length,
        arbeitnow_count: arbeitnowJobs.length,
        total_combined: total,
        adzuna_status: adzunaResult.status,
        arbeitnow_status: arbeitnowResult.status,
        adzuna_error:
          adzunaResult.status === 'rejected' ? String(adzunaResult.reason) : null,
        arbeitnow_error:
          arbeitnowResult.status === 'rejected' ? String(arbeitnowResult.reason) : null
      },
      data: allJobs,
      links: {
        first: '/api/jobs',
        last: '/api/jobs',
        prev: null,
        next: null
      },
      meta: {
        current_page: 1,
        from: total ? 1 : 0,
        last_page: 1,
        path: '/api/jobs',
        per_page: total,
        to: total,
        total
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

async function getAdzunaJobs(pages) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const perPage = 20;

  if (!appId || !appKey) {
    throw new Error('Faltan variables ADZUNA_APP_ID o ADZUNA_APP_KEY');
  }

  const requests = pages.map((page) => {
    const url =
      `https://api.adzuna.com/v1/api/jobs/mx/search/${page}` +
      `?app_id=${encodeURIComponent(appId)}` +
      `&app_key=${encodeURIComponent(appKey)}` +
      `&results_per_page=${perPage}` +
      `&what=developer`;

    return fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jobly'
      }
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Adzuna HTTP ${response.status}`);
      }

      return response.json();
    });
  });

  const responses = await Promise.allSettled(requests);

  const rawJobs = responses.flatMap((response) => {
    if (response.status !== 'fulfilled') return [];
    return Array.isArray(response.value.results) ? response.value.results : [];
  });

  return rawJobs.map((job) => {
    const title = job.title || 'Vacante sin título';

    return {
      slug: `adzuna-${job.id}-${slugify(title)}`,
      title,
      company_name: job.company?.display_name || 'Empresa no especificada',
      location: job.location?.display_name || 'México',
      remote: isRemoteText(`${job.title || ''} ${job.description || ''} ${job.location?.display_name || ''}`),
      url: job.redirect_url || '',
      description: job.description || '',
      tags: buildCleanTags([
        job.category?.label,
        job.location?.display_name,
        'México',
        'Adzuna'
      ]),
      job_types: [job.category?.label || 'General'],
      created_at: job.created
        ? Math.floor(new Date(job.created).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
    };
  });
}

async function getArbeitnowJobs(pages) {
  const requests = pages.map((page) =>
    fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jobly'
      }
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Arbeitnow HTTP ${response.status}`);
      }

      return response.json();
    })
  );

  const responses = await Promise.allSettled(requests);

  const rawJobs = responses.flatMap((response) => {
    if (response.status !== 'fulfilled') return [];
    return Array.isArray(response.value.data) ? response.value.data : [];
  });

  return rawJobs.map((job) => {
    const title = job.title || 'Vacante sin título';

    return {
      slug: `arbeitnow-${job.slug || job.id || slugify(title)}`,
      title,
      company_name: job.company_name || 'Empresa no especificada',
      location: job.location || 'Europa',
      remote: Boolean(job.remote),
      url: job.url || '',
      description: job.description || '',
      tags: buildCleanTags([
        ...(Array.isArray(job.tags) ? job.tags : []),
        job.remote ? 'Remoto' : null,
        'Europa',
        'Arbeitnow'
      ]),
      job_types:
        Array.isArray(job.job_types) && job.job_types.length
          ? job.job_types
          : ['General'],
      created_at: job.created_at || Math.floor(Date.now() / 1000)
    };
  });
}

function buildCleanTags(tags) {
  return tags
    .filter(Boolean)
    .map((tag) => String(tag))
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .slice(0, 4);
}

function isRemoteText(text) {
  const cleanText = String(text).toLowerCase();

  return (
    cleanText.includes('remote') ||
    cleanText.includes('remoto') ||
    cleanText.includes('home office') ||
    cleanText.includes('trabajo desde casa')
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