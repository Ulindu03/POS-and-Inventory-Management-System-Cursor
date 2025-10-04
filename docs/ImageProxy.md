# Image Proxy Usage

To eliminate third-party cookie warnings (e.g., `__cf_bm rejected for invalid domain`), an image proxy endpoint and helper have been added.

## Server Endpoint
`GET /api/proxy/img?url=<encodedRemoteUrl>`

Behavior:
- Accepts only `http` or `https` URLs.
- Streams the remote image after buffering (size limit 5 MB).
- Strips any `Set-Cookie` headers.
- Validates `Content-Type` must start with `image/`.
- Caches for 1 hour (`Cache-Control: public, max-age=3600`).
- 8s timeout; returns 504 on timeout.
- Returns 413 if the remote image exceeds 5 MB.

## Client Helper
`client/src/lib/proxyImage.ts`

```
import { proxyImage } from '@/lib/proxyImage';
<img src={proxyImage(product.imageUrl)} alt={product.name} />
```

Logic:
- Leaves relative paths (`/uploads/...`) and `data:` URIs unchanged.
- Leaves already proxied URLs unchanged.
- Wraps external URLs with `/api/proxy/img?url=...`.

## Migration Steps
1. Find external image usages: look for `http://` or `https://` in components.
2. Wrap those `src` attributes with `proxyImage(...)`.
3. (Optional) For performance, download critical brand assets and serve them locally instead.

## When NOT To Use
- Avoid proxying images that already come from your domain (wastes server resources).
- Do not proxy extremely large or frequently changing images; consider a dedicated CDN.

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| 415 error | Remote `Content-Type` not `image/*` | Ensure URL is a direct image link |
| 413 error | Image > 5MB | Optimize/compress image |
| 504 error | Remote server slow | Increase timeout or host locally |

## Future Enhancements (Optional)
- Add in-memory LRU cache to reduce repeated upstream fetch latency.
- Support WebP conversion for legacy browsers.
- Add signed URL validation to prevent open proxy abuse.

