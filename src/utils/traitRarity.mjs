export function rarestTraits(encoded, collectionStats, limit = 3) {
 if (!collectionStats?.total || !encoded) return [];
 try {
  const seen = new Set();
  return atob(encoded).split(';').flatMap(part => {
   const split = part.indexOf(':');
   if (split < 0) return [];
   const trait = part.slice(0, split).trim(), value = part.slice(split + 1).trim();
   const key = JSON.stringify([trait,value]);
   if (seen.has(key) || ['tags','metadata'].includes(trait)) return [];
   seen.add(key);
   const count = collectionStats.traits[trait]?.[value];
   return Number.isInteger(count) && count > 0 ? [{trait,value,count,percentage:count / collectionStats.total * 100}] : [];
  }).sort((a,b) => a.count-b.count || a.trait.localeCompare(b.trait)).slice(0,limit);
 } catch { return []; }
}
