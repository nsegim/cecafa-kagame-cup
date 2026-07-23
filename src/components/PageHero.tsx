export interface PageHeroSlide {
  title: string
  blurb?: string | null
}

export interface PageHeroAuthor {
  name: string
  avatarUrl: string | null
  dateLabel: string
}

function UpdatedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11A8 8 0 1 0 18.5 15.5M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A simple static banner for sub-pages: title + blurb, with an optional author byline. */
export function PageHero({ slide, author }: { slide: PageHeroSlide; author?: PageHeroAuthor }) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <h1 className="page-hero__title">{slide.title}</h1>
        {slide.blurb && <p className="page-hero__blurb">{slide.blurb}</p>}

        {author && (
          <div className="page-hero__byline">
            <span className="page-hero__avatar">
              {author.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatarUrl} alt="" />
              )}
            </span>
            <span className="page-hero__byline-text">
              By <strong>{author.name}</strong>
              <UpdatedIcon />
              On {author.dateLabel}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
