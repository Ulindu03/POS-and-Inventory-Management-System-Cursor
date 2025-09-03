import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSVGProps {
  value: string;
  className?: string;
  height?: number; // px
  width?: number; // bar width in px
  showValue?: boolean; // show human-readable inside svg
  lineColor?: string;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({ value, className, height = 36, width = 1.3, showValue = false, lineColor = '#000' }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imgRef.current || !value) return;
    try {
      const numeric = /^\d{12,13}$/.test(value);
      const canvas = document.createElement('canvas');
      const attempt = (fmt: any) => JsBarcode(canvas, value, {
        format: fmt,
        displayValue: showValue,
        textPosition: 'bottom',
        textMargin: 2,
        fontSize: 10,
        height,
        margin: 0,
        width,
        lineColor,
        background: '#fff',
      });
      try {
        attempt(numeric ? 'EAN13' : 'CODE128');
      } catch {
        // Fallback to CODE128 if EAN13 fails checksum
        attempt('CODE128');
      }
      const data = canvas.toDataURL('image/png');
      imgRef.current.src = data;
    } catch {
      // swallow
    }
  }, [value, height, width, showValue, lineColor]);

  return <img ref={imgRef} className={className} alt={`Barcode ${value}`} style={{ width: '100%', height: `${height}px`, objectFit: 'contain', imageRendering: 'pixelated', display: 'block', background: '#fff' }} />;
};
