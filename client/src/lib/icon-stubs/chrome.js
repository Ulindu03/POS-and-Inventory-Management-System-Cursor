// Minimal stub to bypass Defender false-positive on lucide-react chrome icon
import * as React from 'react';
export default function ChromeIcon(props) {
  return React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', ...props },
    React.createElement('circle', { cx: 8, cy: 8, r: 7, fill: 'currentColor', opacity: 0.15 }),
    React.createElement('circle', { cx: 8, cy: 8, r: 3, fill: 'currentColor' })
  );
}
export const __esModule = true;
