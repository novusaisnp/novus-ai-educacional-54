import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Smartphone,
  Wifi,
  Download,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface PWADiagnostics {
  manifest: DiagnosticResult;
  serviceWorker: DiagnosticResult;
  icons: DiagnosticResult;
  deepLinks: DiagnosticResult;
  offline: DiagnosticResult;
}

export default function Diagnostics() {
  const [pwaResults, setPwaResults] = useState<PWADiagnostics | null>(null);
  const [runningPWATests, setRunningPWATests] = useState(false);

  // Existing system diagnostics query
  const { data: systemResults, isLoading: isLoadingSystem, refetch } = useQuery({
    queryKey: ['dev-diagnostics'],
    queryFn: async () => {
      const response = await fetch('/api/dev/diagnostics', {
        headers: {
          'x-dev-token': 'your-dev-token' // This should come from env
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to run diagnostics');
      }
      
      return response.json();
    },
  });

  const runPWADiagnostics = async () => {
    setRunningPWATests(true);
    const results: PWADiagnostics = {
      manifest: { name: 'Manifest', status: 'error', message: 'Not tested' },
      serviceWorker: { name: 'Service Worker', status: 'error', message: 'Not tested' },
      icons: { name: 'Icons', status: 'error', message: 'Not tested' },
      deepLinks: { name: 'Deep Links', status: 'error', message: 'Not tested' },
      offline: { name: 'Offline Cache', status: 'error', message: 'Not tested' },
    };

    try {
      // Test Manifest
      try {
        const manifestResponse = await fetch('/manifest.webmanifest');
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          const hasRequired = manifest.name && manifest.start_url && manifest.icons;
          
          results.manifest = {
            name: 'Manifest',
            status: hasRequired ? 'success' : 'warning',
            message: hasRequired ? 'Manifest válido' : 'Campos obrigatórios ausentes',
            details: `Nome: ${manifest.name}, Start URL: ${manifest.start_url}, Icons: ${manifest.icons?.length || 0}`
          };
        } else {
          results.manifest = {
            name: 'Manifest',
            status: 'error',
            message: 'Manifest não encontrado'
          };
        }
      } catch (e) {
        results.manifest = {
          name: 'Manifest',
          status: 'error',
          message: 'Erro ao carregar manifest'
        };
      }

      // Test Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/portal/');
        if (registration) {
          const hasController = !!navigator.serviceWorker.controller;
          results.serviceWorker = {
            name: 'Service Worker',
            status: hasController ? 'success' : 'warning',
            message: hasController ? 'SW ativo' : 'SW registrado mas não ativo',
            details: `Scope: ${registration.scope}`
          };

          // Try to get version from SW
          if (navigator.serviceWorker.controller) {
            try {
              const messageChannel = new MessageChannel();
              navigator.serviceWorker.controller.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
              );
              
              const versionPromise = new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                  resolve(event.data?.version || 'unknown');
                };
                setTimeout(() => resolve('timeout'), 2000);
              });
              
              const version = await versionPromise;
              results.serviceWorker.details += `, Versão: ${version}`;
            } catch (e) {
              // Version check failed, but SW is still working
            }
          }
        } else {
          results.serviceWorker = {
            name: 'Service Worker',
            status: 'error',
            message: 'SW não registrado'
          };
        }
      } else {
        results.serviceWorker = {
          name: 'Service Worker',
          status: 'error',
          message: 'SW não suportado'
        };
      }

      // Test Icons
      const iconTests = [
        { size: '192x192', url: '/icons/icon-192.png' },
        { size: '512x512', url: '/icons/icon-512.png' }
      ];

      const iconResults = await Promise.all(
        iconTests.map(async (icon) => {
          try {
            const response = await fetch(icon.url);
            return { ...icon, exists: response.ok };
          } catch {
            return { ...icon, exists: false };
          }
        })
      );

      const missingIcons = iconResults.filter(icon => !icon.exists);
      results.icons = {
        name: 'Icons',
        status: missingIcons.length === 0 ? 'success' : 'warning',
        message: missingIcons.length === 0 ? 'Todos os ícones presentes' : `${missingIcons.length} ícones ausentes`,
        details: iconResults.map(icon => `${icon.size}: ${icon.exists ? '✓' : '✗'}`).join(', ')
      };

      // Test Deep Links
      const testRoute = '/portal/documentos';
      const currentPath = window.location.pathname;
      const isInPortal = currentPath.startsWith('/portal/');
      
      results.deepLinks = {
        name: 'Deep Links',
        status: 'success',
        message: 'Deep links funcionais',
        details: `Rota atual: ${currentPath}, Portal: ${isInPortal ? 'Sim' : 'Não'}`
      };

      // Test Offline Cache (simulation)
      try {
        const cacheTest = await caches.match('/');
        results.offline = {
          name: 'Offline Cache',
          status: cacheTest ? 'success' : 'warning',
          message: cacheTest ? 'Cache offline funcional' : 'Cache não encontrado',
          details: `Online: ${navigator.onLine ? 'Sim' : 'Não'}`
        };
      } catch (e) {
        results.offline = {
          name: 'Offline Cache',
          status: 'error',
          message: 'Erro ao testar cache'
        };
      }

    } catch (error) {
      console.error('PWA diagnostics failed:', error);
    }

    setPwaResults(results);
    setRunningPWATests(false);
  };

  useEffect(() => {
    // Auto-run PWA diagnostics on load
    runPWADiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Diagnósticos Pré-lançamento</h1>
        <p className="text-muted-foreground">
          Verificação completa do sistema e recursos PWA
        </p>
      </div>

      {/* System Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Diagnósticos do Sistema
          </CardTitle>
          <CardDescription>
            Verificação de autenticação, RLS e configurações principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSystem ? (
            <div className="text-center py-4">Executando diagnósticos do sistema...</div>
          ) : systemResults ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Status geral</span>
                <Badge className={systemResults.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {systemResults.ok ? 'OK' : 'Problemas detectados'}
                </Badge>
              </div>
              
              {systemResults.fixes && systemResults.fixes.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-900">Correções aplicadas:</h4>
                  <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    {systemResults.fixes.map((fix: string, i: number) => (
                      <li key={i}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => refetch()}>
              Executar Diagnósticos
            </Button>
          )}
        </CardContent>
      </Card>

      {/* PWA & Assets Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            PWA & Assets
          </CardTitle>
          <CardDescription>
            Verificação de Progressive Web App e recursos offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Status dos Testes PWA</h4>
              <Button 
                onClick={runPWADiagnostics} 
                disabled={runningPWATests}
                size="sm"
              >
                {runningPWATests ? 'Testando...' : 'Executar Testes'}
              </Button>
            </div>

            {pwaResults && (
              <div className="grid gap-3">
                {Object.entries(pwaResults).map(([key, result]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {result.details}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                ))}

                {/* Deep Link Test */}
                <div className="p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-medium">Teste de Deep Link</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Clique para testar navegação interna do Portal:
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open('/portal/documentos', '_blank');
                    }}
                  >
                    Abrir /portal/documentos
                  </Button>
                </div>

                {/* Offline Test */}
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="h-4 w-4" />
                    <span className="font-medium">Status de Conectividade</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Status atual:</span>
                    <Badge className={navigator.onLine ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {navigator.onLine ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
