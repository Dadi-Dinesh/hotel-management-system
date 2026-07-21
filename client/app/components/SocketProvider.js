"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    s.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected:", s.id);
    });

    s.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
