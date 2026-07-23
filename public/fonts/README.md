# Display font — ITC Avant Garde Gothic ("Vogue Avant Garde")

Drop the licensed font files into **this folder** and the site will use them
automatically — no code change needed. The `@font-face` rules in
`src/app/(frontend)/fonts.css` already point at these exact filenames.

Preferred format is `.woff2` (smallest, best for web). If you only have `.otf`
or `.ttf`, those work too — just keep the names below.

Expected files (add whichever weights you have):

    avant-garde.woff2          <- required (Book / Regular ~400)
    avant-garde-medium.woff2   <- optional (Medium ~500)
    avant-garde-bold.woff2     <- required for headings (Bold/Demi ~700)

Until these files exist, the site falls back to a geometric substitute so
nothing breaks. Once you add them, refresh the page and the real font appears.
