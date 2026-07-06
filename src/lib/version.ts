// Build identity (LCHP-24, D-040): the human version from package.json plus
// the short commit SHA of the build, in SemVer build-metadata syntax. The
// SHA maps 1:1 to Cloudflare Pages deployments and `git log`; the version
// is bumped at milestone completions (M2 → 0.2.0, …, 1.0.0 at the pilot).
// LCHP-17's service worker reuses this constant for update detection.
export const APP_VERSION = `v${__APP_VERSION__}+${__APP_COMMIT__}`
