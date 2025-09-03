import { useEffect } from 'react';
import { getSocket } from '@/lib/realtime';

export function useRealtime(subscribe: (socket: ReturnType<typeof getSocket>) => void) {
  useEffect(() => {
    const s = getSocket();
    subscribe(s);
    return () => {
      s.off('user:created');
      s.off('user:updated');
      s.off('user:deleted');
      s.off('delivery:created');
      s.off('delivery:updated');
      s.off('delivery:status');
    };
  }, [subscribe]);
}
