import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, Trophy, TrendingUp, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Academico() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acadêmico</h1>
        <p className="text-muted-foreground mt-2">
          Central de gestão acadêmica e pedagógica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border-emerald-200">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Chamada</CardTitle>
                <CardDescription>Controle de presença e frequência</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Registre a presença dos alunos por turma e disciplina</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/app/academico/chamada">Abrir Lista</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/chamada?date=today">Hoje</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border-blue-200">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Notas & Avaliações</CardTitle>
                <CardDescription>Sistema de avaliação e boletins</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Crie avaliações e registre notas dos alunos</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/app/academico/notas">Lançar Notas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/avaliacoes?modal=avaliacao&action=novo">Nova Avaliação</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600 border-green-200">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Currículo</CardTitle>
                <CardDescription>Gestão de currículo e conteúdos</CardDescription>
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
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Competências</CardTitle>
                <CardDescription>Acompanhamento de competências</CardDescription>
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
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Relatórios</CardTitle>
                <CardDescription>Relatórios acadêmicos e estatísticas</CardDescription>
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