import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border-blue-200">
                <Calendar className="h-6 w-6" />
              </div>
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
              <div className="p-2 rounded-lg bg-green-50 text-green-600 border-green-200">
                <Users className="h-6 w-6" />
              </div>
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
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border-purple-200">
                <Bell className="h-6 w-6" />
              </div>
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
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border-orange-200">
                <Camera className="h-6 w-6" />
              </div>
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