/* 
Module: useRealtime
Purpose: Simple React hook to help components listen to real-time socket events.
What it gets: A subscribe function. You use it to register the events you need.
What it does: 
  1. Gets a shared socket connection.
  2. Calls your subscribe() so you can add socket.on(...) handlers.
  3. On unmount, removes common event listeners listed below.
Why: Keeps real-time setup/cleanup logic in one place so components stay clean.
How to use (example):
  useRealtime(socket => {
    socket.on('user:created', handleUserCreated);
  });
Note: If you add new events in subscribe, also add matching s.off(...) in cleanup or make a custom cleanup.
*/

import { useEffect } from 'react';
import { getSocket } from '@/lib/realtime';

export function useRealtime(
  subscribe: (socket: ReturnType<typeof getSocket>) => void
) {
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
      s.off('inventory.low_stock');
    };
  }, [subscribe]);
}