'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  latency: number | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latency: null,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Socket connected:', socketInstance.id);
      
      // Auto-subscribe to token updates
      setTimeout(() => {
        socketInstance.emit('subscribe');
      }, 500);
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      setLatency(null);
      console.log('❌ Socket disconnected:', reason);
    });

    let pingInterval: NodeJS.Timeout;
    
    socketInstance.on('connect', () => {
      pingInterval = setInterval(() => {
        if (!socketInstance.connected) return;
        const start = Date.now();
        socketInstance.timeout(5000).emit('ping', (err: any) => {
          if (!err) {
            setLatency(Date.now() - start);
          }
        });
      }, 3000);
    });

    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, latency }}>
      {children}
    </SocketContext.Provider>
  );
}
