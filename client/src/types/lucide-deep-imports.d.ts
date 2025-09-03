// Ambient types for deep ESM imports from lucide-react icons
// This avoids TS errors when importing specific icon modules directly
import * as React from 'react';

declare module 'lucide-react/dist/esm/icons/*' {
  const IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default IconComponent;
}
declare module 'lucide-react/dist/esm/icons/*.js' {
  const IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default IconComponent;
}
