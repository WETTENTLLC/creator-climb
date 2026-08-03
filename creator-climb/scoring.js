// Weighted composite score, matching the discussed model:
// 40% avg viewers, 30% hours watched, 15% growth rate, 10% monetization, 5% community activity
const WEIGHTS = {
  avgViewers: 0.40,
  hoursWatched: 0.30,
  growthRate: 0.15,
  monetization: 0.10,
  community: 0.05
};

// Normalizes each metric against the max value currently on the board (0-100 scale),
// since there's no external benchmark to compare against.
function computeScores(creators) {
  if (creators.length === 0) return [];

  const maxAvgViewers = Math.max(1, ...creators.map(c => Number(c.avg_viewers) || 0));
  const maxHoursWatched = Math.max(1, ...creators.map(c => Number(c.hours_watched) || 0));
  const maxGrowth = Math.max(1, ...creators.map(c => Math.abs(Number(c.growth_rate) || 0)));
  const maxMonetization = Math.max(1, ...creators.map(c => Number(c.monetization_score) || 0));
  const maxCommunity = Math.max(1, ...creators.map(c => Number(c.community_score) || 0));

  return creators.map(c => {
    const nAvgViewers = ((Number(c.avg_viewers) || 0) / maxAvgViewers) * 100;
    const nHoursWatched = ((Number(c.hours_watched) || 0) / maxHoursWatched) * 100;
    const nGrowth = ((Number(c.growth_rate) || 0) / maxGrowth) * 100;
    const nMonetization = ((Number(c.monetization_score) || 0) / maxMonetization) * 100;
    const nCommunity = ((Number(c.community_score) || 0) / maxCommunity) * 100;

    const score =
      nAvgViewers * WEIGHTS.avgViewers +
      nHoursWatched * WEIGHTS.hoursWatched +
      nGrowth * WEIGHTS.growthRate +
      nMonetization * WEIGHTS.monetization +
      nCommunity * WEIGHTS.community;

    return { ...c, score: Math.round(score * 10) / 10 };
  });
}

function rankByScore(creators) {
  return computeScores(creators).sort((a, b) => b.score - a.score);
}

function rankByGrowth(creators) {
  return [...creators].sort((a, b) => (Number(b.growth_rate) || 0) - (Number(a.growth_rate) || 0));
}

module.exports = { computeScores, rankByScore, rankByGrowth, WEIGHTS };
