export function redirectToLocalhost() {
  if (window.location.hostname !== "127.0.0.1") return;
  const { protocol, port, pathname, search, hash } = window.location;
  const target = `${protocol}//localhost${port ? `:${port}` : ""}${pathname}${search}${hash}`;
  window.location.replace(target);
}

