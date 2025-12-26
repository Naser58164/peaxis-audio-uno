import { useState, useCallback, useRef } from 'react';

// Extend Navigator interface for Web Serial API
declare global {
  interface Navigator {
    serial?: {
      requestPort: () => Promise<SerialPortType>;
    };
  }
}

interface SerialPortType {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export interface SerialMessage {
  type: 'location' | 'pressure' | 'heartbeat' | 'unknown';
  data: string;
  timestamp: Date;
}

interface UseSerialConnectionReturn {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: SerialMessage | null;
  messages: SerialMessage[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (data: string) => Promise<void>;
  error: string | null;
}

export function useSerialConnection(): UseSerialConnectionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<SerialMessage | null>(null);
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const portRef = useRef<SerialPortType | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  const parseMessage = (data: string): SerialMessage => {
    const trimmed = data.trim();
    let type: SerialMessage['type'] = 'unknown';
    
    // Parse Arduino messages - customize based on your protocol
    if (trimmed.startsWith('LOC:')) {
      type = 'location';
    } else if (trimmed.startsWith('PRESS:')) {
      type = 'pressure';
    } else if (trimmed.startsWith('HB:')) {
      type = 'heartbeat';
    }

    return {
      type,
      data: trimmed,
      timestamp: new Date(),
    };
  };

  const readLoop = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines (assuming newline-delimited messages)
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            const message = parseMessage(line);
            setLastMessage(message);
            setMessages(prev => [...prev.slice(-99), message]);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'NetworkError') {
        console.error('Serial read error:', err);
        setError(err.message);
      }
    }
  };

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Serial API is not supported in this browser');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      portRef.current = port;
      
      if (port.readable) {
        readerRef.current = port.readable.getReader();
        readLoop(readerRef.current);
      }
      
      if (port.writable) {
        writerRef.current = port.writable.getWriter();
      }
      
      setIsConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      console.error('Serial connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
      
      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }
      
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      
      setIsConnected(false);
      setLastMessage(null);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, []);

  const send = useCallback(async (data: string) => {
    if (!writerRef.current) {
      throw new Error('Not connected');
    }
    
    const encoder = new TextEncoder();
    await writerRef.current.write(encoder.encode(data + '\n'));
  }, []);

  return {
    isSupported,
    isConnected,
    isConnecting,
    lastMessage,
    messages,
    connect,
    disconnect,
    send,
    error,
  };
}
