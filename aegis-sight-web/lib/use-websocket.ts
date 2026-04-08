'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface UseWebSocketOptions {
  reconnect?: boolean;
  maxRetries?: number;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  lastMessage: unknown | null;
  send: (data: unknown) => void;
  disconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { reconnect = true, maxRetries = 5, onMessage, onError } = options;
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<unknown | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef({ onMessage, onError });

  useEffect(() => {
    optionsRef.current = { onMessage, onError };
  }, [onMessage, onError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connectRef = { current: null as (() => void) | null };

    const doConnect = () => {
      setStatus('connecting');
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          optionsRef.current.onMessage?.(data);
        } catch {
          setLastMessage(event.data);
          optionsRef.current.onMessage?.(event.data);
        }
      };

      ws.onerror = (error) => {
        optionsRef.current.onError?.(error);
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        if (reconnect && retriesRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
          retriesRef.current += 1;
          timeoutRef.current = setTimeout(() => connectRef.current?.(), delay);
        }
      };

      wsRef.current = ws;
    };

    connectRef.current = doConnect;
    doConnect();

    return () => {
      connectRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
  }, [url, reconnect, maxRetries]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  return { status, lastMessage, send, disconnect };
}
