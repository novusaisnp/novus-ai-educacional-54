import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/IconBadge';
import { BarChart3, BookOpen, TrendingUp, UserCheck, Gavel, HeartHandshake } from 'lucide-react';
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
              <IconBadge icon={UserCheck} tone="success" />
              <div>
                <CardTitle className="text-xl">Chamada</CardTitle>
                <CardDescription>Controle de presença e frequência</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Registre a presença dos alunos por turma e disciplina</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/app/academico/chamada">Abrir Lista</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/chamada?date=today">Hoje</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/justificativas-falta">Justificativas de Falta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={BarChart3} tone="info" />
              <div>
                <CardTitle className="text-xl">Notas & Avaliações</CardTitle>
                <CardDescription>Sistema de avaliação e boletins</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Crie avaliações e registre notas dos alunos</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/app/academico/notas">Lançar Notas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/avaliacoes?modal=avaliacao&action=novo">Nova Avaliação</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/resultados-periodo">Resultados do Período</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/boletins">Boletim/Histórico</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={Gavel} tone="purple" />
              <div>
                <CardTitle className="text-xl">Conselho de Classe</CardTitle>
                <CardDescription>Ata digital com parecer e decisão por aluno</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Registre pareceres e decisões do colegiado ao final de cada período</p>
            <Button asChild>
              <Link to="/app/academico/conselho-classe">Abrir Conselho de Classe</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={BookOpen} tone="success" />
              <div>
                <CardTitle className="text-xl">Currículo</CardTitle>
                <CardDescription>Disciplinas e professores por turma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Defina quais disciplinas cada turma tem e quem leciona cada uma</p>
            <Button asChild>
              <Link to="/app/academico/curriculo">Abrir Currículo</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={HeartHandshake} tone="warm" />
              <div>
                <CardTitle className="text-xl">Coordenação Inclusiva</CardTitle>
                <CardDescription>PEIs ativos e revisões pendentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Acompanhe todos os Planos Educacionais Individualizados da instituição em um só lugar</p>
            <Button asChild>
              <Link to="/app/academico/pei-coordenacao">Abrir Painel</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <IconBadge icon={TrendingUp} tone="warm" />
              <div>
                <CardTitle className="text-xl">Relatórios</CardTitle>
                <CardDescription>Relatórios acadêmicos e estatísticas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Painéis de frequência, notas e desempenho já disponíveis no BI</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/app/bi/academico">Abrir BI Acadêmico</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/academico/chamada/relatorio">Relatório de Chamada</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}