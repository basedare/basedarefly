/** Keep optional installation out of the routes occupied by participation trays. */
export function isActivityTrayRoute(pathname: string | null) {
  return pathname === '/map' || pathname === '/board' || pathname === '/now'
    || pathname === '/community' || pathname === '/dashboard' || Boolean(pathname?.startsWith('/earn'));
}

export function suppressInstallPrompt(pathname: string | null) {
  return isActivityTrayRoute(pathname) || ['/brands/portal', '/activations', '/moments', '/claim-tag', '/island-trials', '/adventures', '/start', '/create', '/community/rally/new']
    .some((path) => pathname === path || pathname?.startsWith(`${path}/`));
}

/** Immediate entry for participation and guest business enquiries. */
export function bypassDecorativeLoader(pathname: string | null) {
  return ['/brands/portal', '/activations', '/moments', '/adventures', '/island-trials']
    .some(path => pathname === path || pathname?.startsWith(`${path}/`));
}
