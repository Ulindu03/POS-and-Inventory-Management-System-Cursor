import { Request, Response, NextFunction } from 'express';

type CacheEntry = { expires: number; payload: any };
const store = new Map<string, CacheEntry>();

function keyFrom(req: Request) {
  const url = req.originalUrl || req.url;
  const auth = req.headers.authorization || '';
  return `${url}|${auth}`;
}

export function cache(ttlSeconds = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const key = keyFrom(req);
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expires > now) {
      return res.json(hit.payload);
    }
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      store.set(key, { expires: now + ttlSeconds * 1000, payload: body });
      return originalJson(body);
    };
    next();
  };
}

export function cacheBust(pattern: RegExp) {
  for (const k of store.keys()) {
    if (pattern.test(k)) store.delete(k);
  }
}
