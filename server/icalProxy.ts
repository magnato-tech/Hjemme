import type { Connect, Plugin } from 'vite';
import { isAllowedIcalUrl, normalizeIcalUrl } from '../src/utils/icalFeed';

const MAX_CHARS = 5_000_000;

/**
 * Browser fetches of calendar.google.com are blocked. This route downloads the
 * iCal file on the machine that runs the app and returns the text.
 */
export function icalProxyMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const requestUrl = req.url || '';
    if (!requestUrl.startsWith('/api/ical')) {
      next();
      return;
    }

    const target = new URL(requestUrl, 'http://localhost').searchParams.get('url') || '';
    const normalized = normalizeIcalUrl(target);
    if (!isAllowedIcalUrl(normalized)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Kalenderadressen må være en https-adresse til en iCal-fil.');
      return;
    }

    const loader = typeof fetch === 'function' ? fetch : null;
    if (!loader) {
      res.statusCode = 500;
      res.end('Kunne ikke hente kalenderen.');
      return;
    }

    loader(normalized, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Familiekoordinator/1.0' },
    })
      .then(async (response) => {
        if (!isAllowedIcalUrl(response.url)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Kalenderadressen er ikke tillatt.');
          return;
        }
        const text = await response.text();
        if (!response.ok) {
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Kalenderen svarte ikke. Sjekk at iCal-adressen er riktig og fortsatt gyldig.');
          return;
        }
        if (text.length > MAX_CHARS) {
          res.statusCode = 413;
          res.end('Kalenderfilen er for stor.');
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(text);
      })
      .catch(() => {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Kunne ikke hente kalenderen. Sjekk nettverket og adressen.');
      });
  };
}

export function icalProxyPlugin(): Plugin {
  const middleware = icalProxyMiddleware();
  return {
    name: 'ical-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
