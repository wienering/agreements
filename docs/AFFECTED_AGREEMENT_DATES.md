# Affected agreement.date snapshots (UTC off-by-one at sign time)

Signed agreements are **not backfilled** — this list is for records only.

Criteria: `signedAt` where the UTC calendar date differed from the Toronto calendar date at sign time (typically signatures after ~8 PM Toronto). Those snapshots baked in the wrong `{{agreement.date}}` via server UTC formatting.

Generated: 2026-06-10 (Toronto)

| Agreement ID | Client | Signed At (Toronto) | UTC date (in snapshot) | Toronto date (correct) |
|--------------|--------|---------------------|------------------------|------------------------|
| cmq8sx9xu0001js04m6c005yy | Dennis Larkin | 2026-06-10, 9:41:06 p.m. | 2026-06-11 | 2026-06-10 |
| cmm0pc4pt0001ky04aa7mdhu2 | Ben Goldenthal & Sarah Monaco | 2026-03-02, 7:22:59 p.m. | 2026-03-03 | 2026-03-02 |
| cmi3h6j4x0001l404nd4lq5s4 | Green Retrofit Canada c/o Yurgo Alexopoulos | 2025-11-19, 7:04:27 p.m. | 2025-11-20 | 2025-11-19 |
| cmhyz2iei0001kz04hq8md5z1 | Expand Properites Inc. | 2025-11-14, 7:43:11 p.m. | 2025-11-15 | 2025-11-14 |

Total signed with mergedHtml: 31  
Likely affected: 4

Re-run: `npx tsx scripts/list-affected-agreement-dates.ts`
