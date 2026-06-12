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

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

module.exports = {
  getArbeitnowJobs
};