const https = require('https');

module.exports = async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1);
    const perPage = 20;

    const result = await fetchJson('https://remotive.com/api/remote-jobs');
    const jobs = Array.isArray(result.jobs) ? result.jobs : [];

    const mappedJobs = jobs.map((job) => {
      const title = job.title || 'Vacante sin título';
      const id = job.id || Math.random().toString(36).slice(2);

      return {
        slug: `${id}-${slugify(title)}`,
        title,
        company_name: job.company_name || 'Empresa no especificada',
        location: job.candidate_required_location || 'Remote',
        remote: true,
        url: job.url || '',
        description: job.description || '',
        tags: Array.isArray(job.tags) ? job.tags : [],
        job_types: job.job_type ? [job.job_type] : ['Full-time'],
        created_at: job.publication_date
          ? Math.floor(new Date(job.publication_date).getTime() / 1000)
          : Math.floor(Date.now() / 1000)
      };
    });

    const start = (page - 1) * perPage;
    const paginatedJobs = mappedJobs.slice(start, start + perPage);
    const total = mappedJobs.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    res.status(200).json({
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

    res.status(200).json({
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TechHire-Dashboard'
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

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}