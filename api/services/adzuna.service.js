const { adzuna } = require('../config/env');

const ADZUNA_COUNTRIES = [
  { code: 'mx', label: 'México' },
  { code: 'br', label: 'Brasil' },
  { code: 'ar', label: 'Argentina' },
  { code: 'cl', label: 'Chile' },
  { code: 'co', label: 'Colombia' }
];

async function getAdzunaJobs(pages) {
  const appId = adzuna.appId;
  const appKey = adzuna.appKey;
  const perPage = 20;

  if (!appId || !appKey) {
    throw new Error('Faltan variables ADZUNA_APP_ID o ADZUNA_APP_KEY');
  }

  const requests = ADZUNA_COUNTRIES.flatMap((country) =>
    pages.map((page) => {
      const url =
        `https://api.adzuna.com/v1/api/jobs/${country.code}/search/${page}` +
        `?app_id=${encodeURIComponent(appId)}` +
        `&app_key=${encodeURIComponent(appKey)}` +
        `&results_per_page=${perPage}` +
        `&what=developer`;

      return fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Jobly'
        }
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Adzuna ${country.code.toUpperCase()} HTTP ${response.status}`);
          }

          return response.json();
        })
        .then((data) => ({
          country,
          results: Array.isArray(data.results) ? data.results : []
        }));
    })
  );

  const responses = await Promise.allSettled(requests);

  const rawJobs = responses.flatMap((response) => {
    if (response.status !== 'fulfilled') return [];

    return response.value.results.map((job) => ({
      ...job,
      source_country: response.value.country
    }));
  });

  return rawJobs.map((job) => {
    const title = job.title || 'Vacante sin título';
    const countryName = job.source_country?.label || 'LATAM';

    return {
      slug: `adzuna-${job.source_country?.code || 'latam'}-${job.id}-${slugify(title)}`,
      title,
      company_name: job.company?.display_name || 'Empresa no especificada',
      location: job.location?.display_name || countryName,
      remote: isRemoteText(`${job.title || ''} ${job.description || ''} ${job.location?.display_name || ''}`),
      url: job.redirect_url || '',
      description: job.description || '',
      tags: buildCleanTags([
        job.category?.label,
        job.location?.display_name,
        countryName,
        'Adzuna'
      ]),
      job_types: [job.category?.label || 'General'],
      created_at: job.created
        ? Math.floor(new Date(job.created).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
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
    cleanText.includes('trabajo desde casa') ||
    cleanText.includes('work from home')
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

module.exports = {
  getAdzunaJobs
};