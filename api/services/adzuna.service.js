const { adzuna } = require('../config/env');

async function getAdzunaJobs(pages) {
  const appId = adzuna.appId;
  const appKey = adzuna.appKey;
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