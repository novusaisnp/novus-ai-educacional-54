// Modelo do contrato de matrícula. O texto de verdade usado numa assinatura vem
// da tabela `contract_templates` (editável pela secretaria, sem deploy) — este
// DEFAULT_TEMPLATE_BODY só serve de fallback pra organizações que ainda não
// criaram nenhum template ativo (ver useActiveContractTemplate).
//
// NOTA IMPORTANTE: este texto é um modelo de referência com a estrutura padrão
// de um contrato de prestação de serviços educacionais (objeto, obrigações das
// partes, pagamento, rescisão, LGPD, foro, validade da assinatura eletrônica).
// Não é uma certificação jurídica — recomenda-se revisão por advogado da
// instituição antes do uso com alunos/responsáveis reais.
// Nota de formatação: cada parágrafo/item fica numa única linha lógica (sem
// quebra manual no meio) — quem decide onde quebrar linha na página é o
// renderizador do PDF (generateEnrollmentContractPdf.ts), que reflui e
// justifica o texto pra largura real da página. Quebras de linha aqui servem
// só de separador entre blocos (cabeçalho/seção/parágrafo).
export const DEFAULT_TEMPLATE_BODY = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS

CONTRATANTE (Instituição): {{organizacao}}
CONTRATANTE (Responsável): {{responsavel}} {{responsavel_cpf}}
ALUNO(A): {{aluno}}{{aluno_nascimento}}
TURMA: {{turma}}
DATA DA MATRÍCULA: {{data_matricula}}

1. DO OBJETO
A CONTRATADA se compromete a prestar serviços educacionais ao(à) aluno(a) acima identificado(a), na turma indicada, conforme calendário letivo e projeto pedagógico vigentes na instituição.

2. DAS OBRIGAÇÕES DA CONTRATADA
2.1. Ministrar as atividades pedagógicas conforme o calendário letivo aprovado.
2.2. Zelar pela segurança e bem-estar do aluno durante o período em que estiver sob a responsabilidade da instituição.
2.3. Comunicar ao responsável, em tempo hábil, questões relevantes sobre o desempenho e a frequência do aluno.

3. DAS OBRIGAÇÕES DO CONTRATANTE (RESPONSÁVEL)
3.1. Efetuar o pagamento da mensalidade na forma e no prazo estabelecidos na cláusula 4.
3.2. Manter atualizados os dados cadastrais do aluno e do responsável.
3.3. Observar e fazer observar pelo aluno as normas do regimento escolar.

4. DO VALOR E DA FORMA DE PAGAMENTO
O valor da mensalidade é de R$ {{valor_mensalidade}}, com vencimento todo dia {{dia_vencimento}} de cada mês, salvo reajustes anuais previstos em lei e comunicados ao responsável com antecedência mínima de 30 (trinta) dias.

5. DA RESCISÃO E DO CANCELAMENTO
5.1. Este contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.
5.2. O cancelamento da matrícula não desobriga o pagamento de mensalidades vencidas até a data efetiva de desligamento do aluno.

6. DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais do aluno e do responsável serão tratados pela CONTRATADA exclusivamente para as finalidades educacionais, administrativas e financeiras decorrentes deste contrato, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), podendo ser compartilhados com sistemas de gestão administrativo-financeira integrados à instituição na medida necessária à execução deste contrato.

7. DA ASSINATURA ELETRÔNICA
Este contrato é firmado eletronicamente. A confirmação de aceite abaixo, contendo o nome completo digitado pelo responsável e a concordância expressa com os termos aqui descritos, tem validade de assinatura eletrônica simples, nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2/2001, dispensando certificado digital no padrão ICP-Brasil por acordo entre as partes.

8. DO FORO
Fica eleito o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.`;

export interface ContractPlaceholderData {
  organizationName: string;
  studentName: string;
  studentBirthDate?: string;
  guardianName?: string;
  guardianCpf?: string;
  className: string;
  monthlyFeeAmount: number;
  dueDay: number;
  enrollmentDate: string; // YYYY-MM-DD
}

function formatCpf(cpf?: string): string {
  if (!cpf) return '';
  return cpf.length === 11 ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return year && month && day ? `${day}/${month}/${year}` : dateStr;
}

// Substituição simples de placeholders {{chave}} — sem motor de template externo,
// suficiente para o conjunto fixo de campos que este contrato precisa.
export function renderContractText(templateBody: string, data: ContractPlaceholderData): string {
  const replacements: Record<string, string> = {
    organizacao: data.organizationName,
    responsavel: data.guardianName || 'Não informado (aluno maior de idade)',
    responsavel_cpf: data.guardianCpf ? `- CPF ${formatCpf(data.guardianCpf)}` : '',
    aluno: data.studentName,
    aluno_nascimento: data.studentBirthDate ? ` - Nascimento: ${formatDateBR(data.studentBirthDate)}` : '',
    turma: data.className,
    data_matricula: formatDateBR(data.enrollmentDate),
    // Number(...) porque, na pré-visualização ao vivo (form.watch()), o valor
    // ainda é a string bruta do input antes da coerção do Zod rodar (só ocorre
    // na validação/submit) — sem isso, .toFixed quebra com "not a function".
    valor_mensalidade: Number(data.monthlyFeeAmount || 0).toFixed(2).replace('.', ','),
    dia_vencimento: String(Number(data.dueDay || 10)),
  };

  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.split(`{{${key}}}`).join(value),
    templateBody
  );
}

export async function hashContractText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
