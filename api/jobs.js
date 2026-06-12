const { getAdzunaJobs } = require('./services/adzuna.service');
const { getArbeitnowJobs } = require('./services/arbeitnow.service');

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

function removeDuplicates(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const key = `${job.company_name}-${job.title}`.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}