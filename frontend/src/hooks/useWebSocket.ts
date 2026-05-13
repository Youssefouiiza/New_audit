'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface UseWebSocketOptions {
  onMessage?: (msg: any) => void;
  onNotification?: (notif: any) => void;
  roomId?: string;
}

export function useWebSocket({ onMessage, onNotification, roomId }: UseWebSocketOptions = {}) {
  const clientRef = useRef<Client | null>(null);
  const { token, user } = useAuthStore();

  const sendMessage = useCallback((destination: string, body: object) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        // Subscribe to chat room messages
        if (roomId) {
          client.subscribe(`/topic/room.${roomId}`, (msg: IMessage) => {
            try { onMessage?.(JSON.parse(msg.body)); } catch {}
          });
        }
        // Subscribe to personal notifications
        client.subscribe(`/queue/notifications.${user.id}`, (msg: IMessage) => {
          try { onNotification?.(JSON.parse(msg.body)); } catch {}
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token, user, roomId, onMessage, onNotification]);

  return { sendMessage, isConnected: () => clientRef.current?.connected ?? false };
}
