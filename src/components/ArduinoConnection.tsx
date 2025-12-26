import { useEffect } from 'react';
import { Usb, Unplug, AlertCircle, Activity, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSerialConnection, type SerialMessage } from '@/hooks/useSerialConnection';
import { type AuscultationLocation } from '@/components/ManikinDiagram';

interface ArduinoConnectionProps {
  onLocationDetected?: (location: AuscultationLocation) => void;
  onPressureChange?: (pressure: number) => void;
}

// Map Arduino location codes to auscultation locations
const locationMap: Record<string, AuscultationLocation> = {
  'LUNG_UL': 'lung_upper_left',
  'LUNG_UR': 'lung_upper_right',
  'LUNG_LL': 'lung_lower_left',
  'LUNG_LR': 'lung_lower_right',
  'HEART_AORTIC': 'heart_aortic',
  'HEART_MITRAL': 'heart_mitral',
};

export function ArduinoConnection({ onLocationDetected, onPressureChange }: ArduinoConnectionProps) {
  const {
    isSupported,
    isConnected,
    isConnecting,
    lastMessage,
    messages,
    connect,
    disconnect,
    send,
    error,
  } = useSerialConnection();

  // Process incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'location') {
      // Parse location from "LOC:AORTIC" format
      const locationCode = lastMessage.data.replace('LOC:', '').trim();
      const location = locationMap[locationCode];
      if (location && onLocationDetected) {
        onLocationDetected(location);
      }
    } else if (lastMessage.type === 'pressure') {
      // Parse pressure from "PRESS:75" format
      const pressure = parseInt(lastMessage.data.replace('PRESS:', '').trim(), 10);
      if (!isNaN(pressure) && onPressureChange) {
        onPressureChange(pressure);
      }
    }
  }, [lastMessage, onLocationDetected, onPressureChange]);

  const getMessageIcon = (message: SerialMessage) => {
    switch (message.type) {
      case 'location':
        return <MapPin className="h-3 w-3 text-primary" />;
      case 'pressure':
        return <Activity className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Usb className="h-4 w-4" />
            Hardware Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Usb className="h-4 w-4" />
            Arduino Connection
          </CardTitle>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={connect} 
              disabled={isConnecting}
              className="flex-1"
            >
              <Usb className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Arduino'}
            </Button>
          ) : (
            <Button 
              onClick={disconnect} 
              variant="destructive"
              className="flex-1"
            >
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {isConnected && (
          <>
            {/* Last detected location */}
            {lastMessage?.type === 'location' && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Last Location:</span>
                  <Badge variant="outline">
                    {lastMessage.data.replace('LOC:', '')}
                  </Badge>
                </div>
              </div>
            )}

            {/* Message log */}
            <div>
              <p className="text-sm font-medium mb-2">Serial Log</p>
              <ScrollArea className="h-[120px] border rounded-lg p-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Waiting for data...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {messages.slice().reverse().map((msg, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 text-xs"
                      >
                        {getMessageIcon(msg)}
                        <span className="text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="font-mono">{msg.data}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Send command */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => send('PING')}
              >
                Send Ping
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => send('STATUS')}
              >
                Get Status
              </Button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Connect your Arduino to enable physical manikin integration. 
          The system expects messages in format: LOC:LOCATION_NAME or PRESS:VALUE
        </p>
      </CardContent>
    </Card>
  );
}
