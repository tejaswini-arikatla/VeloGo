import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface SocketContextType {
  isConnected: boolean;
  subscribeToRide: (
    rideId: string,
    onStatusUpdate: (ride: any) => void,
    onLocationUpdate?: (location: any) => void
  ) => () => void;
  subscribeToCaptainDispatch: (
    captainId: string,
    onDispatch: (dispatch: any) => void
  ) => () => void;
  subscribeToUserNotifications: (
    userId: string,
    onNotification: (notification: any) => void
  ) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL: brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  const subscribeToRide = (
    rideId: string,
    onStatusUpdate: (ride: any) => void,
    onLocationUpdate?: (location: any) => void
  ) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      // Return a retry or no-op
      const timer = setInterval(() => {
        if (stompClientRef.current?.connected) {
          clearInterval(timer);
          doSubscribe();
        }
      }, 500);
      return () => clearInterval(timer);
    }

    let sub1: any = null;
    let sub2: any = null;

    const doSubscribe = () => {
      if (!stompClientRef.current?.connected) return;
      sub1 = stompClientRef.current.subscribe(`/topic/ride/${rideId}`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          onStatusUpdate(payload);
        } catch (e) {}
      });

      if (onLocationUpdate) {
        sub2 = stompClientRef.current.subscribe(`/topic/ride/${rideId}/location`, (msg) => {
          try {
            const loc = JSON.parse(msg.body);
            onLocationUpdate(loc);
          } catch (e) {}
        });
      }
    };

    doSubscribe();

    return () => {
      sub1?.unsubscribe();
      sub2?.unsubscribe();
    };
  };

  const subscribeToCaptainDispatch = (
    captainId: string,
    onDispatch: (dispatch: any) => void
  ) => {
    if (!stompClientRef.current?.connected) {
      const timer = setInterval(() => {
        if (stompClientRef.current?.connected) {
          clearInterval(timer);
          doSub();
        }
      }, 500);
      return () => clearInterval(timer);
    }

    let sub: any = null;
    const doSub = () => {
      if (!stompClientRef.current?.connected) return;
      sub = stompClientRef.current.subscribe(`/topic/captain/${captainId}/dispatch`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          onDispatch(payload);
        } catch (e) {}
      });
    };

    doSub();

    return () => {
      sub?.unsubscribe();
    };
  };

  const subscribeToUserNotifications = (
    userId: string,
    onNotification: (notification: any) => void
  ) => {
    if (!stompClientRef.current?.connected) {
      const timer = setInterval(() => {
        if (stompClientRef.current?.connected) {
          clearInterval(timer);
          doSub();
        }
      }, 500);
      return () => clearInterval(timer);
    }

    let sub: any = null;
    const doSub = () => {
      if (!stompClientRef.current?.connected) return;
      sub = stompClientRef.current.subscribe(`/topic/user/${userId}/notifications`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          onNotification(payload);
        } catch (e) {}
      });
    };

    doSub();

    return () => {
      sub?.unsubscribe();
    };
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        subscribeToRide,
        subscribeToCaptainDispatch,
        subscribeToUserNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
