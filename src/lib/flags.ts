// App-level flags. USING_SAMPLE_DATA gates the "sample data" ribbon and is
// flipped off when the map reads real data (LCHP-13).
export const USING_SAMPLE_DATA = true

// «Guarda tu cuenta» ships hidden (LCHP-29, D-060): Supabase's built-in
// sender is not production-grade (about two emails an hour, documented as
// delivering only to the project's team), and whether the app should
// require login at all is an open question with the association. Flip it
// on when email delivery (LCHP-31) and that policy are settled.
export const REGISTRATION_ENABLED = false
