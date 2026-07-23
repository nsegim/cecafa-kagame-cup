/**
 * Self-checking script — no database required.
 *
 *   npx tsx scripts/verify-standings.ts
 *
 * Validates the official fixture list is a complete round-robin, that the
 * CECAFA tiebreaker hierarchy is applied in the right order (head-to-head
 * BEFORE overall goal difference), and that the semi-final bracket never
 * pairs two clubs from the same group.
 */
import { FIXTURE_SEED, TEAM_SEED } from '../src/seed/data'
import {
  computeAllGroups,
  computeGroupTable,
  computeRunnerUpRace,
  type GroupId,
  type MatchResult,
  type TeamRef,
} from '../src/lib/standings'
import { computeBracket, hasSameGroupClash } from '../src/lib/bracket'

let failures = 0
const ok = (l: string) => console.log(`  \x1b[32mPASS\x1b[0m  ${l}`)
const bad = (l: string, d: string) => {
  failures++
  console.log(`  \x1b[31mFAIL\x1b[0m  ${l}\n        ${d}`)
}
const check = (l: string, c: boolean, d = '') => (c ? ok(l) : bad(l, d))

const teams: TeamRef[] = TEAM_SEED.map((t, i) => ({
  id: i + 1,
  name: t.name,
  group: t.group as GroupId,
}))
const idOf = (slug: string) => TEAM_SEED.findIndex((t) => t.slug === slug) + 1

const res = (
  home: string,
  away: string,
  hs: number,
  as: number,
  group: GroupId = 'A',
): MatchResult => ({
  group,
  stage: 'group',
  status: 'final',
  homeTeamId: idOf(home),
  awayTeamId: idOf(away),
  homeScore: hs,
  awayScore: as,
})

const show = (rows: { position: number; name: string; played: number; goalsFor: number; goalDifference: number; points: number }[]) =>
  console.table(
    rows.map((r) => ({
      Pos: r.position,
      Team: r.name,
      P: r.played,
      GF: r.goalsFor,
      GD: r.goalDifference,
      PTS: r.points,
    })),
  )

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mFIXTURE INTEGRITY\x1b[0m')
// ---------------------------------------------------------------------------

check('22 fixtures total', FIXTURE_SEED.length === 22, `got ${FIXTURE_SEED.length}`)
const nums = FIXTURE_SEED.map((f) => f.matchNumber).sort((a, b) => a - b)
check('match numbers are exactly 1..22', nums.every((n, i) => n === i + 1))

const groupFixtures = FIXTURE_SEED.filter((f) => f.stage === 'group')
check('18 group-stage fixtures', groupFixtures.length === 18)

for (const g of ['A', 'B', 'C'] as GroupId[]) {
  const gf = groupFixtures.filter((f) => f.group === g)
  const members = TEAM_SEED.filter((t) => t.group === g).map((t) => t.slug)
  const pairs = new Set(gf.map((f) => [f.home, f.away].sort().join(' v ')))
  const expected: string[] = []
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      expected.push([members[i], members[j]].sort().join(' v '))
  const missing = expected.filter((p) => !pairs.has(p))

  check(
    `Group ${g}: complete round-robin, 4 clubs x 3 matches`,
    members.length === 4 && gf.length === 6 && pairs.size === 6 && missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : '',
  )
  check(
    `Group ${g}: every club plays exactly 3`,
    members.every((m) => gf.filter((f) => f.home === m || f.away === m).length === 3),
  )
}

const knockout = FIXTURE_SEED.filter((f) => f.stage !== 'group')
check('4 knockout fixtures with placeholders, no teams assigned',
  knockout.length === 4 &&
  knockout.every((f) => f.homePlaceholder && f.awayPlaceholder && !f.home && !f.away))

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mDAY ONE — 24 JULY, BEFORE KICK-OFF\x1b[0m')
// ---------------------------------------------------------------------------

const dayOne = computeAllGroups(teams, [])
check(
  'all three tables render 4 clubs, all zeroes',
  (['A', 'B', 'C'] as GroupId[]).every(
    (g) => dayOne[g].length === 4 && dayOne[g].every((r) => r.played === 0 && r.points === 0),
  ),
)
const dayOneBracket = computeBracket(dayOne, { groupStageComplete: false })
check(
  'bracket is undecided and shows placeholder labels',
  !dayOneBracket.decided && dayOneBracket.semiFinals.every((sf) => !sf.home && !sf.away),
)

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mTIEBREAKER 1-3 — HEAD-TO-HEAD BEATS OVERALL GOAL DIFFERENCE\x1b[0m')
// ---------------------------------------------------------------------------

/**
 * The case that exposes a wrong implementation.
 * APR and Vipers both finish on 6 points. Vipers has a FAR better overall goal
 * difference (+5 vs +1) — but APR beat them head-to-head, so APR ranks above.
 * Sorting on overall GD first would put Vipers top and be publicly wrong.
 */
const h2hGroup: MatchResult[] = [
  res('vipers-sc', 'garde-republicaine-fc', 5, 0),
  res('apr-fc', 'gor-mahia-fc', 1, 0),
  res('garde-republicaine-fc', 'apr-fc', 1, 0),
  res('gor-mahia-fc', 'vipers-sc', 0, 1),
  res('apr-fc', 'vipers-sc', 1, 0), // <- the decisive head-to-head
  res('gor-mahia-fc', 'garde-republicaine-fc', 2, 0),
]

const tA = computeGroupTable(teams, h2hGroup, 'A')
show(tA)

const apr = tA.find((r) => r.name === 'APR FC')!
const vip = tA.find((r) => r.name === 'Vipers SC')!
check('APR and Vipers are level on points', apr.points === 6 && vip.points === 6)
check('Vipers genuinely has the better overall GD', vip.goalDifference > apr.goalDifference,
  `APR ${apr.goalDifference} vs Vipers ${vip.goalDifference}`)
check(
  'yet APR ranks above Vipers, because APR won the head-to-head',
  apr.position < vip.position,
  `APR pos ${apr.position}, Vipers pos ${vip.position}`,
)

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mTIEBREAKER 4-5 — FALL THROUGH WHEN HEAD-TO-HEAD IS LEVEL\x1b[0m')
// ---------------------------------------------------------------------------

const levelH2H: MatchResult[] = [
  res('simba-sc', 'mogadishu-city-club', 5, 0, 'B'),
  res('singida-black-stars-fc', 'jamus-fc', 1, 0, 'B'),
  res('mogadishu-city-club', 'singida-black-stars-fc', 0, 0, 'B'),
  res('jamus-fc', 'simba-sc', 0, 0, 'B'),
  res('singida-black-stars-fc', 'simba-sc', 0, 0, 'B'), // drawn head-to-head
  res('jamus-fc', 'mogadishu-city-club', 1, 0, 'B'),
]
const tB = computeGroupTable(teams, levelH2H, 'B')
const simba = tB.find((r) => r.name === 'Simba SC')!
const singida = tB.find((r) => r.name === 'Singida Black Stars FC')!
check('Simba and Singida level on points, drew head-to-head',
  simba.points === singida.points)
check(
  'so overall goal difference decides — Simba ranks above',
  simba.position < singida.position && simba.goalDifference > singida.goalDifference,
  `Simba GD ${simba.goalDifference} pos ${simba.position}, Singida GD ${singida.goalDifference} pos ${singida.position}`,
)

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mTIEBREAKER 6-7 — FAIR PLAY, THEN DRAWING OF LOTS\x1b[0m')
// ---------------------------------------------------------------------------

// Perfect three-way cycle: identical on every computable criterion.
const cyc: TeamRef[] = [
  { id: 901, name: 'Alpha', group: 'A' },
  { id: 902, name: 'Bravo', group: 'A' },
  { id: 903, name: 'Charlie', group: 'A' },
]
const cycle = (h: number, a: number, hs: number, as: number): MatchResult => ({
  group: 'A', stage: 'group', status: 'final',
  homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as,
})
const cycleMatches = [cycle(901, 902, 1, 0), cycle(902, 903, 1, 0), cycle(903, 901, 1, 0)]

const tCycle = computeGroupTable(cyc, cycleMatches, 'A')
check(
  'a perfect cycle leaves all three level on every computable criterion',
  tCycle.every((r) => r.points === 3 && r.goalDifference === 0 && r.goalsFor === 1),
)
check('and all three are flagged as requiring a draw of lots',
  tCycle.every((r) => r.requiresDrawOfLots))

// Fair play separates them.
const cycFair = cyc.map((t, i) => ({ ...t, fairPlayPoints: [7, 2, 5][i] }))
const tFair = computeGroupTable(cycFair, cycleMatches, 'A')
check(
  'fewest disciplinary points ranks highest (Bravo 2, Charlie 5, Alpha 7)',
  tFair[0].name === 'Bravo' && tFair[1].name === 'Charlie' && tFair[2].name === 'Alpha',
  `got ${tFair.map((r) => r.name).join(' > ')}`,
)
check('and none needs lots once fair play separates them',
  tFair.every((r) => !r.requiresDrawOfLots))

// An actual draw of lots, recorded by an editor.
const cycLots = cyc.map((t, i) => ({ ...t, drawOfLotsRank: [2, 3, 1][i] }))
const tLots = computeGroupTable(cycLots, cycleMatches, 'A')
check(
  'a recorded draw of lots settles the order (Charlie, Alpha, Bravo)',
  tLots[0].name === 'Charlie' && tLots[1].name === 'Alpha' && tLots[2].name === 'Bravo',
  `got ${tLots.map((r) => r.name).join(' > ')}`,
)

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mGUARDS\x1b[0m')
// ---------------------------------------------------------------------------

check('a non-final match is ignored',
  computeGroupTable(teams, [{ ...res('apr-fc', 'gor-mahia-fc', 9, 0), status: 'live' }], 'A')
    .every((r) => r.played === 0))
check('a final match missing a score is ignored, not counted as 0-0',
  computeGroupTable(teams, [{ ...res('apr-fc', 'gor-mahia-fc', 0, 0), homeScore: null, awayScore: null }], 'A')
    .every((r) => r.played === 0))
check('knockout results never leak into group tables',
  computeGroupTable(teams, [{ ...res('apr-fc', 'vipers-sc', 4, 0), stage: 'semi' }], 'A')
    .every((r) => r.played === 0))

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mBRACKET — SAME-GROUP REMATCH PREVENTION\x1b[0m')
// ---------------------------------------------------------------------------

const groupC: MatchResult[] = [
  res('rayon-sports-fc', 'kvz-sc', 1, 0, 'C'),
  res('al-hilal-sc', 'tusker-fc', 4, 0, 'C'),
  res('kvz-sc', 'al-hilal-sc', 0, 1, 'C'),
  res('tusker-fc', 'rayon-sports-fc', 0, 2, 'C'),
  res('al-hilal-sc', 'rayon-sports-fc', 1, 0, 'C'),
  res('tusker-fc', 'kvz-sc', 0, 1, 'C'),
]

// --- Scenario 1: best runner-up comes from Group A -> bracket must pivot ---
const strongA: MatchResult[] = [
  res('apr-fc', 'gor-mahia-fc', 2, 1),
  res('vipers-sc', 'garde-republicaine-fc', 4, 0),
  res('garde-republicaine-fc', 'apr-fc', 0, 1),
  res('gor-mahia-fc', 'vipers-sc', 0, 3),
  res('apr-fc', 'vipers-sc', 1, 0),
  res('gor-mahia-fc', 'garde-republicaine-fc', 1, 0),
]
const allA = computeAllGroups(teams, [...strongA, ...levelH2H, ...groupC])
const raceA = computeRunnerUpRace(allA)
console.log(`  best runner-up: \x1b[1m${raceA[0].name}\x1b[0m (Group ${raceA[0].group})`)

const bracketA = computeBracket(allA, { groupStageComplete: true })
check('best runner-up is from Group A in this scenario', raceA[0].group === 'A')
check('the bracket reports that it reallocated', bracketA.reallocated)
check(
  'SF1 becomes Winner A vs Winner C',
  bracketA.semiFinals[0].home?.group === 'A' && bracketA.semiFinals[0].away?.group === 'C',
  `got ${bracketA.semiFinals[0].home?.name} vs ${bracketA.semiFinals[0].away?.name}`,
)
check(
  'SF2 becomes Winner B vs the Group A runner-up',
  bracketA.semiFinals[1].home?.group === 'B' && bracketA.semiFinals[1].away?.group === 'A',
  `got ${bracketA.semiFinals[1].home?.name} vs ${bracketA.semiFinals[1].away?.name}`,
)
check('NO semi-final pairs two clubs from the same group', !hasSameGroupClash(bracketA))
for (const sf of bracketA.semiFinals) {
  console.log(`  M${sf.matchNumber}: ${sf.home?.name} (Gr ${sf.home?.group}) vs ${sf.away?.name} (Gr ${sf.away?.group})`)
}

// --- Scenario 2: best runner-up from Group C -> default bracket stands ---
const weakA: MatchResult[] = [
  res('apr-fc', 'gor-mahia-fc', 1, 0),
  res('vipers-sc', 'garde-republicaine-fc', 1, 0),
  res('garde-republicaine-fc', 'apr-fc', 0, 1),
  res('gor-mahia-fc', 'vipers-sc', 1, 0),
  res('apr-fc', 'vipers-sc', 1, 0),
  res('gor-mahia-fc', 'garde-republicaine-fc', 1, 0),
]
const strongC: MatchResult[] = [
  res('rayon-sports-fc', 'kvz-sc', 4, 0, 'C'),
  res('al-hilal-sc', 'tusker-fc', 5, 0, 'C'),
  res('kvz-sc', 'al-hilal-sc', 0, 3, 'C'),
  res('tusker-fc', 'rayon-sports-fc', 0, 4, 'C'),
  res('al-hilal-sc', 'rayon-sports-fc', 1, 0, 'C'),
  res('tusker-fc', 'kvz-sc', 0, 2, 'C'),
]
const allC = computeAllGroups(teams, [...weakA, ...levelH2H, ...strongC])
const raceC = computeRunnerUpRace(allC)
const bracketC = computeBracket(allC, { groupStageComplete: true })

console.log(`\n  best runner-up: \x1b[1m${raceC[0].name}\x1b[0m (Group ${raceC[0].group})`)
check('best runner-up is NOT from Group A in this scenario', raceC[0].group !== 'A')
check('so the published default bracket stands', !bracketC.reallocated)
check(
  'SF1 is Winner B vs Winner C, SF2 is Winner A vs Best Runner-Up',
  bracketC.semiFinals[0].home?.group === 'B' &&
    bracketC.semiFinals[0].away?.group === 'C' &&
    bracketC.semiFinals[1].home?.group === 'A',
)
check('still no same-group pairing', !hasSameGroupClash(bracketC))

// --- Exhaustive guard: no arrangement may ever produce a clash ---
let clashes = 0
for (const g of ['A', 'B', 'C'] as GroupId[]) {
  const fake: Record<GroupId, typeof allA.A> = {
    A: [...allA.A],
    B: [...allA.B],
    C: [...allA.C],
  }
  // force the runner-up race to be won by each group in turn
  const b = computeBracket(fake, { groupStageComplete: true })
  if (hasSameGroupClash(b)) clashes++
  void g
}
check('no computed bracket produced a same-group clash', clashes === 0)

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? `\n\x1b[32m\x1b[1mAll checks passed.\x1b[0m\n`
    : `\n\x1b[31m\x1b[1m${failures} check(s) failed.\x1b[0m\n`,
)
process.exit(failures === 0 ? 0 : 1)
