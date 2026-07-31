import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconBadge } from '@/components/IconBadge';
import { Calendar, Users, Bell, Camera } from 'lucide-react';

export default function Eventos() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground mt-2">
          Gestão de eventos e atividades escolares
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={Calendar} tone="info" />
              <div>
                <CardTitle className="text-xl">Calendário</CardTitle>
                <CardDescription>Calendário escolar e eventos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={Users} tone="success" />
              <div>
                <CardTitle className="text-xl">Participantes</CardTitle>
                <CardDescription>Gestão de participantes e inscrições</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={Bell} tone="purple" />
              <div>
                <CardTitle className="text-xl">Notificações</CardTitle>
                <CardDescription>Sistema de notificações de eventos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={Camera} tone="warm" />
              <div>
                <CardTitle className="text-xl">Galeria</CardTitle>
                <CardDescription>Galeria de fotos e memórias</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
