/*
 * <cecafa-match> — the CECAFA Kagame Cup Live Expressions feed as a web
 * component, for embedding a single match into any web page WITHOUT an iframe.
 *
 * Usage on a partner page:
 *   <cecafa-match match-id="3"></cecafa-match>
 *   <script src="https://<cecafa-host>/embed/cecafa-match.js" async></script>
 *
 * How it works: the element renders the feed into its own Shadow DOM (so the
 * host page's CSS can't leak in and ours can't leak out — the isolation an
 * iframe gives, without the fixed-height box), and polls
 * `/embed/matches/{id}/widget` — a CORS-enabled JSON endpoint that returns the
 * whole feed already rendered to safe HTML. Because it's real DOM in the host
 * document, it flows with the page and needs no height/resize handshake.
 *
 * The data origin is the origin THIS script was served from, so a partner never
 * has to configure a URL — they copy the two lines above and nothing else.
 */
;(function () {
  'use strict'
  if (window.customElements && customElements.get('cecafa-match')) return

  // --- Resolve the origin we were loaded from -----------------------------
  // `document.currentScript` is set while a classic script runs (even async);
  // fall back to scanning for our own <script> for the module/edge cases.
  function scriptOrigin() {
    try {
      var s = document.currentScript
      if (s && s.src) return new URL(s.src).origin
      var all = document.getElementsByTagName('script')
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('cecafa-match.js') !== -1) {
          return new URL(all[i].src).origin
        }
      }
    } catch (e) {
      /* fall through */
    }
    return window.location.origin
  }
  var ORIGIN = scriptOrigin()

  // Media/crest/photo URLs come back site-relative ("/api/media/..."); resolve
  // them against the CECAFA origin so they load from a partner page too.
  function abs(url) {
    if (!url) return url
    return url.charAt(0) === '/' ? ORIGIN + url : url
  }

  var POLL_LIVE_MS = 15000
  var POLL_IDLE_MS = 60000

  var STRINGS = {
    tabsLive: 'UKO UMUKINO URI KUGENDA',
    tabsStats: "IMIBARE Y'UMUKINO",
    tabsPhotos: "AMAFOTO Y'UMUKINO",
    statGoals: 'Ibitego',
    statYellows: "Amakarita y'umuhondo",
    statReds: "Amakarita y'umutuku",
    empty: "Ubusesenguzi bw'umukino buraza umukino nutangira.",
    credit: 'CECAFA Kagame Cup 2026 · Komeza ukurikirane →',
    live: 'LIVE',
  }

  var STYLE = [
    ':host{',
    '  --navy:#002452;--red:#aa0205;--green:#02aa16;--gold:#f5a623;',
    '  --ink900:#101820;--ink700:#575757;--ink500:#6e6969;--ink300:#aab3c5;',
    '  --line:#dedada;--band:#f5f5f5;--white:#fff;',
    '  display:block;max-width:960px;margin:0 auto;',
    '  font-family:var(--cm-font, system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);',
    '  color:var(--ink900);line-height:1.5;text-align:left;',
    '}',
    '*{box-sizing:border-box}',
    '.cm-card{background:var(--white);border:1px solid var(--line)}',
    // hero
    '.cm-hero{background:var(--navy);color:#fff;padding:20px 24px;display:flex;flex-direction:column;align-items:center;gap:14px}',
    '.cm-meta{font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;opacity:.85}',
    '.cm-teams{display:flex;align-items:center;justify-content:center;gap:28px;width:100%}',
    '.cm-team{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 0;min-width:0}',
    '.cm-crest{width:44px;height:44px;object-fit:contain}',
    '.cm-crest--mono{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);border-radius:50%;font-size:13px;font-weight:800;letter-spacing:.02em}',
    '.cm-name{font-size:15px;font-weight:700;text-transform:uppercase;text-align:center;line-height:1.2}',
    '.cm-score{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:6px}',
    '.cm-nums{font-size:40px;font-weight:800;letter-spacing:.02em;display:flex;gap:14px;line-height:1}',
    '.cm-ko{font-size:26px;font-weight:800;letter-spacing:.02em}',
    '.cm-pill{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:2px;background:rgba(255,255,255,.15)}',
    '.cm-pill--live{background:var(--red);color:#fff;display:inline-flex;align-items:center;gap:6px}',
    '.cm-pill--live .cm-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:cm-blink 1.4s infinite}',
    '@keyframes cm-blink{0%,100%{opacity:1}50%{opacity:.25}}',
    // body + tabs
    '.cm-body{padding:8px 20px 16px}',
    '.cm-tabs{display:flex;border-bottom:1px solid var(--line);margin-bottom:8px}',
    '.cm-tab{border:0;background:transparent;padding:14px 18px;font:inherit;font-size:14px;font-weight:500;color:var(--ink500);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;text-transform:uppercase;letter-spacing:.02em}',
    '.cm-tab.is-active{color:var(--navy);border-bottom-color:var(--red);font-weight:700}',
    // feed
    '.cm-feed{display:flex;flex-direction:column}',
    '.cm-entry{display:grid;grid-template-columns:38px 26px 1fr;gap:14px;align-items:start;padding:16px 0;border-bottom:1px solid var(--line)}',
    '.cm-min{font-weight:700;color:var(--navy);font-size:14px;padding-top:1px}',
    '.cm-icon{width:22px;height:22px;border-radius:50%;display:inline-block;margin-top:1px}',
    '.cm-icon--goal{background:var(--green);box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)}',
    '.cm-icon--yellow{width:15px;height:21px;border-radius:2px;background:var(--gold)}',
    '.cm-icon--red{width:15px;height:21px;border-radius:2px;background:var(--red)}',
    '.cm-icon--whistle{background:var(--ink300)}',
    '.cm-icon--sub{position:relative;width:16px;height:22px;background:none;border-radius:0}',
    '.cm-icon--sub::before,.cm-icon--sub::after{content:"";position:absolute;left:0;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent}',
    '.cm-icon--sub::before{top:0;border-bottom:9px solid var(--red)}',
    '.cm-icon--sub::after{bottom:0;border-top:9px solid var(--green)}',
    '.cm-text{font-size:15px;color:var(--ink700);line-height:1.5;margin:0}',
    '.cm-text strong{color:var(--navy)}',
    '.cm-caption{margin:0 0 .35em}',
    '.cm-caption:last-child{margin-bottom:0}',
    '.cm-rich>:first-child{margin-top:0}.cm-rich>:last-child{margin-bottom:0}',
    '.cm-rich p{margin:0 0 .5em}',
    '.cm-rich ul,.cm-rich ol{margin:.25em 0 .5em;padding-left:1.25em}',
    '.cm-rich li{margin:.15em 0}',
    '.cm-rich strong{color:var(--navy)}',
    '.cm-rich a{color:var(--red);text-decoration:underline}',
    '.cm-rich blockquote{margin:.4em 0;padding-left:.75em;border-left:3px solid var(--line);color:var(--ink500)}',
    '.cm-video{display:block;position:relative;width:100%;aspect-ratio:16/9;margin:.6em 0;border-radius:4px;overflow:hidden;background:var(--navy)}',
    '.cm-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
    // per-entry photos
    '.cm-photo{margin:12px 0 0;padding:0}',
    '.cm-photo figcaption,.cm-figcap{font-size:13px;color:var(--ink500);margin-top:6px}',
    '.cm-photos{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}',
    '.cm-pbtn{padding:0;border:0;cursor:pointer;background:var(--band);overflow:hidden;display:block;width:100%}',
    '.cm-photos .cm-pbtn{flex:1 1 calc((100% - 12px)/2);min-width:0}',
    '.cm-pbtn img{display:block;width:100%;height:100%;object-fit:contain;background:var(--band)}',
    '.cm-pbtn--land img{object-fit:cover;object-position:top center}',
    '.cm-pbtn{aspect-ratio:16/9}',
    // stats
    '.cm-stats{padding-top:8px}',
    '.cm-stats-head{display:flex;justify-content:space-between;font-weight:700;color:var(--navy);padding:12px 0;border-bottom:2px solid var(--navy)}',
    '.cm-stat{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;text-align:center;padding:14px 0;border-bottom:1px solid var(--line)}',
    '.cm-stat-label{color:var(--ink500);font-size:14px}',
    '.cm-stat-val{font-weight:700;color:var(--navy)}',
    // photos grid
    '.cm-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding-top:16px}',
    '.cm-grid .cm-pbtn{aspect-ratio:16/9}',
    '.cm-grid .cm-pbtn img{object-fit:cover}',
    // empty + credit
    '.cm-empty{color:var(--ink500);font-size:15px;padding:24px 0}',
    '.cm-credit{display:block;padding:12px 20px;border-top:1px solid var(--line);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--navy);text-align:center;text-decoration:none}',
    '.cm-credit:hover{color:var(--red)}',
    // lightbox
    '.cm-lb{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}',
    '.cm-lb img{max-width:92vw;max-height:88vh;object-fit:contain}',
    '.cm-lb-close{position:absolute;top:16px;right:20px;background:none;border:0;color:#fff;font-size:30px;cursor:pointer;line-height:1}',
    '.cm-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:none;border:0;color:#fff;font-size:46px;cursor:pointer;padding:0 18px}',
    '.cm-lb-prev{left:8px}.cm-lb-next{right:8px}',
    '.cm-lb-count{position:absolute;bottom:18px;left:0;right:0;text-align:center;color:#fff;font-size:14px}',
    '.cm-loading{padding:40px 20px;text-align:center;color:var(--ink500);font-size:14px}',
    '@media(max-width:520px){.cm-teams{gap:16px}.cm-nums{font-size:32px;gap:10px}.cm-name{font-size:13px}}',
  ].join('\n')

  function el(tag, cls, html) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (html != null) e.innerHTML = html
    return e
  }

  var ICON_CLASS = {
    goal: 'cm-icon cm-icon--goal',
    yellow: 'cm-icon cm-icon--yellow',
    red: 'cm-icon cm-icon--red',
    substitution: 'cm-icon cm-icon--sub',
  }
  function iconClass(type) {
    return ICON_CLASS[type] || 'cm-icon cm-icon--whistle'
  }

  class CecafaMatch extends HTMLElement {
    static get observedAttributes() {
      return ['match-id']
    }
    connectedCallback() {
      this._root = this.attachShadow({ mode: 'open' })
      this._tab = 'live'
      this._lastJson = ''
      this._data = null
      this._timer = 0
      this._render() // loading skeleton
      this._load()
    }
    disconnectedCallback() {
      if (this._timer) clearTimeout(this._timer)
      this._closeLightbox()
    }
    attributeChangedCallback(name, oldV, newV) {
      if (name === 'match-id' && oldV !== null && oldV !== newV && this._root) {
        this._lastJson = ''
        this._load()
      }
    }
    get matchId() {
      return this.getAttribute('match-id')
    }

    _schedule(ms) {
      if (this._timer) clearTimeout(this._timer)
      if (ms == null) return
      var self = this
      this._timer = setTimeout(function () {
        self._load()
      }, ms)
    }

    _load() {
      var id = this.matchId
      if (!id) return
      var self = this
      fetch(ORIGIN + '/embed/matches/' + encodeURIComponent(id) + '/widget', {
        headers: { Accept: 'application/json' },
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status)
          return r.text()
        })
        .then(function (text) {
          if (text !== self._lastJson) {
            self._lastJson = text
            self._data = JSON.parse(text)
            self._render()
          }
          var d = self._data
          self._schedule(d && d.live ? POLL_LIVE_MS : d && d.status === 'final' ? null : POLL_IDLE_MS)
        })
        .catch(function () {
          if (!self._data) self._renderError()
          // Keep trying on a slow cadence — a partner's transient network blip
          // shouldn't kill a live feed permanently.
          self._schedule(POLL_IDLE_MS)
        })
    }

    // --- rendering --------------------------------------------------------
    _render() {
      if (!this._root) return
      var style = '<style>' + STYLE + '</style>'
      if (!this._data) {
        this._root.innerHTML = style + '<div class="cm-card"><div class="cm-loading">…</div></div>'
        return
      }
      var d = this._data
      var card = el('div', 'cm-card')
      card.appendChild(this._hero(d))
      var body = el('div', 'cm-body')
      body.appendChild(this._tabs())
      body.appendChild(this._panel(d))
      card.appendChild(body)
      var credit = el('a', 'cm-credit', STRINGS.credit)
      credit.href = ORIGIN + '/matches/' + d.id
      credit.target = '_blank'
      credit.rel = 'noopener noreferrer'
      card.appendChild(credit)

      this._root.innerHTML = style
      this._root.appendChild(card)
    }

    _renderError() {
      this._root.innerHTML =
        '<style>' +
        STYLE +
        '</style><div class="cm-card"><div class="cm-loading">Live feed unavailable.</div></div>'
    }

    _crest(side) {
      if (side.crestUrl) {
        var img = el('img', 'cm-crest')
        img.src = abs(side.crestUrl)
        img.alt = ''
        img.loading = 'lazy'
        return img
      }
      var mono = el('span', 'cm-crest cm-crest--mono', escapeText(side.monogram || '—'))
      return mono
    }

    _hero(d) {
      var hero = el('div', 'cm-hero')
      if (d.metaLabel) hero.appendChild(el('span', 'cm-meta', escapeText(d.metaLabel)))
      var teams = el('div', 'cm-teams')

      var home = el('div', 'cm-team')
      home.appendChild(this._crest(d.home))
      home.appendChild(el('span', 'cm-name', escapeText(d.home.shortLabel || d.home.label)))

      var score = el('div', 'cm-score')
      if (d.status === 'scheduled') {
        score.appendChild(el('span', 'cm-ko', escapeText(d.kickoffLabel)))
      } else {
        score.appendChild(el('span', 'cm-nums', '<span>' + d.homeScore + '</span><span>:</span><span>' + d.awayScore + '</span>'))
      }
      if (d.status === 'live') {
        score.appendChild(el('span', 'cm-pill cm-pill--live', '<span class="cm-dot"></span>' + STRINGS.live))
      } else if (d.status === 'final') {
        score.appendChild(el('span', 'cm-pill', 'FT'))
      } else {
        score.appendChild(el('span', 'cm-pill', escapeText(d.kickoffLabel)))
      }

      var away = el('div', 'cm-team')
      away.appendChild(this._crest(d.away))
      away.appendChild(el('span', 'cm-name', escapeText(d.away.shortLabel || d.away.label)))

      teams.appendChild(home)
      teams.appendChild(score)
      teams.appendChild(away)
      hero.appendChild(teams)
      return hero
    }

    _tabs() {
      var wrap = el('div', 'cm-tabs')
      var self = this
      ;[
        ['live', STRINGS.tabsLive],
        ['stats', STRINGS.tabsStats],
        ['photos', STRINGS.tabsPhotos],
      ].forEach(function (pair) {
        var b = el('button', 'cm-tab' + (self._tab === pair[0] ? ' is-active' : ''), escapeText(pair[1]))
        b.type = 'button'
        b.addEventListener('click', function () {
          self._tab = pair[0]
          self._render()
        })
        wrap.appendChild(b)
      })
      return wrap
    }

    _panel(d) {
      if (this._tab === 'stats') return this._stats(d)
      if (this._tab === 'photos') return this._photos(d)
      return this._live(d)
    }

    _live(d) {
      var feed = el('div', 'cm-feed')
      if (!d.events.length) return el('div', '', '<p class="cm-empty">' + escapeText(STRINGS.empty) + '</p>')
      var self = this
      d.events.forEach(function (e) {
        var group = el('div')
        var entry = el('div', 'cm-entry')
        entry.appendChild(el('span', 'cm-min', escapeText(e.minuteLabel)))
        entry.appendChild(el('span', iconClass(e.type)))
        var text = el('div', 'cm-text')
        if (e.captionHtml) text.appendChild(el('p', 'cm-caption', e.captionHtml))
        if (e.bodyHtml) {
          var rich = el('div', 'cm-rich', e.bodyHtml)
          ;(e.videos || []).forEach(function (url) {
            rich.appendChild(el('span', 'cm-video', '<iframe src="' + escapeAttr(url) + '" title="Video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'))
          })
          text.appendChild(rich)
        }
        entry.appendChild(text)
        group.appendChild(entry)

        var imgs = e.images || []
        var urls = imgs.map(function (i) {
          return abs(i.url)
        })
        if (imgs.length === 1) {
          var fig = el('figure', 'cm-photo')
          fig.appendChild(self._photoBtn(imgs[0], urls, 0))
          if (e.photoCaption) fig.appendChild(el('figcaption', 'cm-figcap', escapeText(e.photoCaption)))
          group.appendChild(fig)
        } else if (imgs.length > 1) {
          var row = el('div', 'cm-photos')
          imgs.forEach(function (im, j) {
            row.appendChild(self._photoBtn(im, urls, j))
          })
          group.appendChild(row)
        }
        feed.appendChild(group)
      })
      return feed
    }

    _photoBtn(image, urls, index) {
      var landscape = image.width >= image.height
      var b = el('button', 'cm-pbtn' + (landscape ? ' cm-pbtn--land' : ''))
      b.type = 'button'
      var img = el('img')
      img.src = abs(image.url)
      img.alt = ''
      img.loading = 'lazy'
      b.appendChild(img)
      var self = this
      b.addEventListener('click', function () {
        self._openLightbox(urls, index)
      })
      return b
    }

    _stats(d) {
      var wrap = el('div', 'cm-stats')
      var head = el('div', 'cm-stats-head')
      head.appendChild(el('span', '', escapeText(d.home.label)))
      head.appendChild(el('span', '', escapeText(d.away.label)))
      wrap.appendChild(head)
      var rows = [
        [STRINGS.statGoals, d.stats.home.goals, d.stats.away.goals],
        [STRINGS.statYellows, d.stats.home.yellows, d.stats.away.yellows],
        [STRINGS.statReds, d.stats.home.reds, d.stats.away.reds],
      ]
      rows.forEach(function (r) {
        var row = el('div', 'cm-stat')
        row.appendChild(el('span', 'cm-stat-val', String(r[1])))
        row.appendChild(el('span', 'cm-stat-label', escapeText(r[0])))
        row.appendChild(el('span', 'cm-stat-val', String(r[2])))
        wrap.appendChild(row)
      })
      return wrap
    }

    _photos(d) {
      if (!d.photos.length) return el('div', '', '<p class="cm-empty"></p>')
      var grid = el('div', 'cm-grid')
      var urls = d.photos.map(abs)
      var self = this
      d.photos.forEach(function (src, i) {
        var b = el('button', 'cm-pbtn')
        b.type = 'button'
        var img = el('img')
        img.src = abs(src)
        img.alt = ''
        img.loading = 'lazy'
        b.appendChild(img)
        b.addEventListener('click', function () {
          self._openLightbox(urls, i)
        })
        grid.appendChild(b)
      })
      return grid
    }

    // --- lightbox ---------------------------------------------------------
    _openLightbox(urls, index) {
      this._lb = { urls: urls, index: index }
      this._drawLightbox()
      var self = this
      this._keyHandler = function (ev) {
        if (ev.key === 'Escape') self._closeLightbox()
        else if (ev.key === 'ArrowLeft') self._moveLightbox(-1)
        else if (ev.key === 'ArrowRight') self._moveLightbox(1)
      }
      document.addEventListener('keydown', this._keyHandler)
    }
    _moveLightbox(delta) {
      if (!this._lb) return
      var n = this._lb.urls.length
      this._lb.index = (this._lb.index + delta + n) % n
      this._drawLightbox()
    }
    _drawLightbox() {
      if (this._lbEl) this._lbEl.remove()
      var lb = this._lb
      var count = lb.urls.length
      var overlay = el('div', 'cm-lb')
      var self = this
      overlay.addEventListener('click', function () {
        self._closeLightbox()
      })
      var close = el('button', 'cm-lb-close', '✕')
      close.type = 'button'
      overlay.appendChild(close)
      var img = el('img')
      img.src = lb.urls[lb.index]
      img.alt = ''
      img.addEventListener('click', function (ev) {
        ev.stopPropagation()
      })
      overlay.appendChild(img)
      if (count > 1) {
        var prev = el('button', 'cm-lb-nav cm-lb-prev', '‹')
        prev.type = 'button'
        prev.addEventListener('click', function (ev) {
          ev.stopPropagation()
          self._moveLightbox(-1)
        })
        var next = el('button', 'cm-lb-nav cm-lb-next', '›')
        next.type = 'button'
        next.addEventListener('click', function (ev) {
          ev.stopPropagation()
          self._moveLightbox(1)
        })
        overlay.appendChild(prev)
        overlay.appendChild(next)
        overlay.appendChild(el('div', 'cm-lb-count', lb.index + 1 + ' / ' + count))
      }
      this._lbEl = overlay
      this._root.appendChild(overlay)
    }
    _closeLightbox() {
      if (this._lbEl) {
        this._lbEl.remove()
        this._lbEl = null
      }
      this._lb = null
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler)
        this._keyHandler = null
      }
    }
  }

  // Text escaping for the values WE interpolate (names, minute labels, meta).
  // The rich-text/caption HTML is already sanitised server-side and injected
  // as-is on purpose.
  function escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
  function escapeAttr(s) {
    return escapeText(s).replace(/"/g, '&quot;')
  }

  customElements.define('cecafa-match', CecafaMatch)
})()
