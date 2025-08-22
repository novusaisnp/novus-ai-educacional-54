import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, FileText, Target } from 'lucide-react';

export default function Pedagogico() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pedagógico</h1>
        <p className="text-muted-foreground mt-2">
          Planejamento e acompanhamento pedagógico
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
                <CardTitle className="text-xl">Planos de Aula</CardTitle>
                <CardDescription>Planejamento de aulas e atividades</CardDescription>
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
                <CardTitle className="text-xl">Acompanhamento</CardTitle>
                <CardDescription>Acompanhamento individual dos alunos</CardDescription>
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
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Projetos</CardTitle>
                <CardDescription>Gestão de projetos pedagógicos</CardDescription>
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
                <Target className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Objetivos</CardTitle>
                <CardDescription>Definição e acompanhamento de objetivos</CardDescription>
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