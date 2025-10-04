// Utility to build a proxied image URL so third-party cookies are not sent or set.
// Example usage:
//   <img src={proxyImage(remoteUrl)} alt="..." />
// If remoteUrl is already relative or same-origin, it returns as-is.

export function proxyImage(url: string | undefined | null): string {
  if (!url) return '';
  try {
    // If it's already relative or a data URI, return unchanged
    if (url.startsWith('/') || url.startsWith('data:')) return url;
    const lower = url.toLowerCase();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return url;
    // Avoid double-proxying
    if (lower.includes('/api/proxy/img?')) return url;
    const encoded = encodeURIComponent(url);
    return `/api/proxy/img?url=${encoded}`;
  } catch {
    return url;
  }
}
