import type { Match, Player, Team, Video } from '@/payload-types'
import { getTournamentData, getLeaderboards, type LeaderboardRow } from '@/lib/tournament'
import { fetchLatestNews } from '@/lib/news'
import { matchDayLabel } from '@/lib/datetime'
import { shortTeamLabel, mediaUrl } from '@/lib/homepage'
import { FeaturedGrid, type UpcomingGroup } from '@/components/FeaturedGrid'
import { Highlights, type HighlightCard } from '@/components/Highlights'
import { StandingsTable } from '@/components/StandingsTable'
import { PlayersPerformance, type PerfRow } from '@/components/PlayersPerformance'
import { HomeGallery } from '@/components/HomeGallery'
import { LatestNews } from '@/components/LatestNews'
import { getHomeGalleryTiles } from '@/lib/gallery'
import { getVideos } from '@/lib/videos'
import type { GroupId } from '@/lib/standings'

export const revalidate = 300

const POSITION_LABEL: Record<string, string> = {
  GK: 'Goalkeeper (GK)',
  CB: 'Centre-Back (CB)',
  LB: 'Full-Back (LB)',
  RB: 'Full-Back (RB)',
  CDM: 'Defensive Midfielder (CDM)',
  CM: 'Central Midfielder (CM)',
  CAM: 'Attacking Midfielder (CAM)',
  LW: 'Left Winger (LW)',
  RW: 'Right Winger (RW)',
  ST: 'Striker (ST)',
}

/**
 * Highlight cards come from the editor-managed Videos collection, newest
 * added first. If none are visible yet, fall back to matches that already
 * have a highlight video attached, then to a preview of the next few
 * fixtures — so the section is never empty before an editor adds a video.
 *
 * Videos are generic (a title, not a forced "Team A vs Team B") since not
 * every video is match footage. The two fallback tiers below genuinely are
 * about a specific match, so they build a "home vs away" string for the title.
 */
function getHighlightCards(matches: Match[], videos: Video[]): HighlightCard[] {
  const editorCards: HighlightCard[] = videos.map((v) => ({
    id: v.id,
    title: v.title,
    dateLabel: v.dateLabel ?? '',
    thumbnailUrl: mediaUrl(v.thumbnail),
    videoUrl: v.videoUrl || null,
  }))

  if (editorCards.length > 0) return editorCards

  const withVideo = matches
    .filter((m) => m.highlightUrl)
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
    .slice(0, 6)

  if (withVideo.length > 0) {
    return withVideo.map((m) => ({
      id: m.id,
      title: `${shortTeamLabel(m.homeTeam, m.homeTeamPlaceholder)} vs ${shortTeamLabel(m.awayTeam, m.awayTeamPlaceholder)}`,
      dateLabel: matchDayLabel(m.kickoff),
      thumbnailUrl:
        m.highlightThumb && typeof m.highlightThumb !== 'number'
          ? m.highlightThumb.sizes?.card?.url || m.highlightThumb.url || null
          : null,
      videoUrl: m.highlightUrl!,
    }))
  }

  // Before any highlights exist, preview the next few fixtures instead.
  const preview = matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, 6)

  return preview.map((m) => ({
    id: m.id,
    title: `${shortTeamLabel(m.homeTeam, m.homeTeamPlaceholder)} vs ${shortTeamLabel(m.awayTeam, m.awayTeamPlaceholder)}`,
    dateLabel: matchDayLabel(m.kickoff),
    thumbnailUrl: null,
    videoUrl: null,
  }))
}

/** The "Upcoming Games" sidebar: next fixtures, grouped by day. */
function groupUpcoming(matches: Match[], take = 4): UpcomingGroup[] {
  const upcoming = matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, take)

  const groups: UpcomingGroup[] = []
  for (const m of upcoming) {
    const dateLabel = matchDayLabel(m.kickoff)
    const last = groups[groups.length - 1]
    if (last && last.dateLabel === dateLabel) last.matches.push(m)
    else groups.push({ dateLabel, matches: [m] })
  }
  return groups
}

function toPerfRow(rows: LeaderboardRow[]): PerfRow[] {
  return rows.map((r) => {
    const player = r.player as Player
    const photo = player.photo
    const photoUrl =
      photo && typeof photo !== 'number' ? (photo.sizes?.crest?.url ?? photo.url) : null
    return {
      name: player.name,
      team: r.team?.name ?? '',
      teamShort: r.team?.shortName ?? '',
      position: POSITION_LABEL[player.position] ?? player.position,
      played: r.played,
      goals: r.goals,
      assists: r.assists,
      cleanSheets: r.cleanSheets,
      photoUrl,
    }
  })
}

export default async function HomePage() {
  const [data, leaderboards, news, homeGalleryTiles, videos] = await Promise.all([
    getTournamentData(),
    getLeaderboards(),
    fetchLatestNews({ limit: 11 }),
    getHomeGalleryTiles(),
    getVideos(),
  ])

  const teamsById = new Map<number, Team>(data.teams.map((t) => [t.id, t]))
  const highlightCards = getHighlightCards(data.matches, videos)
  const upcomingGroups = groupUpcoming(data.matches)
  const topNews = news.slice(0, 6)
  const bottomNews = news.slice(6, 11)

  return (
    <>
      <FeaturedGrid
        featured={topNews[0] ?? null}
        list={topNews.slice(1)}
        upcoming={upcomingGroups}
      />

      <Highlights cards={highlightCards} />

      {/* Standings */}
      <section className="section section--band" id="standings">
        <div className="container">
          <div className="section-head">
            <span className="kicker">AMATSINDA</span>
            <h2>Urutonde</h2>
          </div>
          <div className="standings-grid">
            {(['A', 'B', 'C'] as GroupId[]).map((g) => (
              <StandingsTable key={g} group={g} rows={data.tables[g]} teamsById={teamsById} />
            ))}
          </div>
        </div>
      </section>

      <PlayersPerformance
        goals={toPerfRow(leaderboards.goals)}
        assists={toPerfRow(leaderboards.assists)}
        cleanSheets={toPerfRow(leaderboards.cleanSheets)}
      />

      <HomeGallery tiles={homeGalleryTiles} />

      <LatestNews articles={bottomNews} />
    </>
  )
}
