import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PerfDiagnosticsCard } from '@/components/dev/PerfDiagnosticsCard';
import { UxDiagnosticsCard } from '@/components/dev/UxDiagnosticsCard';

type WebManifest = {
  name?: string;
  start_url?: string;
  icons?: Array<{
    src: string;
    sizes?: string;
    type?: string;
  }>;
};

const PWADiagnostics = () => {
  const [manifest, setManifest] = useState<WebManifest | null>(null);
  const [swStatus, setSWStatus] = useState<string>('checking...');

  useEffect(() => {
    // Check manifest
    fetch('/manifest.webmanifest')
      .then(res => res.json())
      .then((data: WebManifest) => setManifest(data))
      .catch(() => setManifest(null));

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/')
        .then(registration => {
          if (!registration) {
            setSWStatus('not registered');
          } else if (registration.active) {
            setSWStatus('active');
          } else if (registration.waiting) {
            setSWStatus('waiting');
          } else if (registration.installing) {
            setSWStatus('installing');
          } else {
            setSWStatus('registered');
          }
        })
        .catch(() => setSWStatus('error'));
    } else {
      setSWStatus('not supported');
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>PWA & Assets</CardTitle>
        <CardDescription>
          Progressive Web App configuration and assets status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manifest Status */}
        <div className="flex items-center justify-between">
          <span>Web App Manifest</span>
          <Badge variant={manifest ? "default" : "destructive"}>
            {manifest ? "✅ Loaded" : "❌ Missing"}
          </Badge>
        </div>

        {manifest && (
          <div className="ml-4 space-y-2 text-sm text-muted-foreground">
            <div>Name: {manifest.name || 'Not set'}</div>
            <div>Start URL: {manifest.start_url || 'Not set'}</div>
            <div>Icons: {manifest.icons?.length || 0} configured</div>
          </div>
        )}

        {/* Service Worker Status */}
        <div className="flex items-center justify-between">
          <span>Service Worker</span>
          <Badge variant={swStatus === 'active' ? "default" : "secondary"}>
            {swStatus === 'active' ? "✅" : swStatus === 'registered' || swStatus === 'waiting' || swStatus === 'installing' ? "⚠️" : "❌"} {swStatus}
          </Badge>
        </div>

        {/* Deep Links Test */}
        <div className="flex items-center justify-between">
          <span>Deep Links</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/portal/documentos', '_blank')}
          >
            Test Portal Link
          </Button>
        </div>

        {/* Icons Check */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>App Icons</span>
            <div className="flex gap-2">
              <img
                src="/icons/icon-192.png"
                alt="192x192"
                className="w-6 h-6 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <img
                src="/icons/icon-512.png"
                alt="512x512"
                className="w-6 h-6 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DevDiagnosticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Diagnósticos do Sistema</h1>
        <p className="text-muted-foreground">
          Verificação de status e configurações PWA
        </p>
      </div>
      <PWADiagnostics />
      <PerfDiagnosticsCard />
      <UxDiagnosticsCard />
    </div>
  );
}
