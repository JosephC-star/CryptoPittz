// Return redirects before static routing applies Range requests to redirect bodies.
export default function canonicalDomain(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'cryptopittz.com' && url.hostname !== 'www.cryptopittz.com') return;

  url.protocol = 'https:';
  url.host = 'thepittzstop.com';
  url.port = '';
  return new Response(null, {
    status: 301,
    headers: {
      Location: url.href,
      'Cache-Control': 'no-store',
    },
  });
}
