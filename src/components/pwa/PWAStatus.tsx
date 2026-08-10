
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw,
  X
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import { useState } from 'react';

export function PWAStatus() {
  const { canInstall, isOnline, hasUpdate, install, reloadForUpdate } = usePWA();
  const [showUpdateBanner, setShowUpdateBanner] = useState(true);

  if (!canInstall && !hasUpdate && isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conexão estável</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant={isOnline ? "secondary" : "destructive"} 
              className="flex items-center gap-1"
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOnline ? 'Conexão estável' : 'Sem conexão - usando cache'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Update Banner */}
      {hasUpdate && showUpdateBanner && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Atualização disponível
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reloadForUpdate}
                  className="h-6 text-xs"
                >
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUpdateBanner(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Install Button */}
      {canInstall && (
        <Button
          size="sm"
          variant="outline"
          onClick={install}
          className="flex items-center gap-2 w-full"
        >
          <Download className="h-4 w-4" />
          Instalar App
        </Button>
      )}
    </div>
  );
}
