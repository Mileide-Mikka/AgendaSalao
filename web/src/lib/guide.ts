export type GuideLesson = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  to?: string;
  cta?: string;
};

export const GUIDE_STORAGE_KEY = 'belle-guide-completed';

export const GUIDE_LESSONS: GuideLesson[] = [
  {
    id: 'start',
    title: '1. Comece por aqui',
    summary: 'O sistema nasce vazio: você cadastra o que for do seu salão.',
    steps: [
      'No primeiro acesso, preencha seus dados (nome, profissão, telefone e e-mail) e troque a senha.',
      'Em Configurações, ajuste o nome do salão, horário de funcionamento e o visual (tema claro/escuro).',
      'Use o botão de seta / três tracinhos no menu para compactar a barra lateral.',
    ],
    tip: 'Guarde bem a nova senha — ela protege toda a agenda do estabelecimento.',
    to: '/app/configuracoes',
    cta: 'Abrir configurações',
  },
  {
    id: 'services',
    title: '2. Cadastre os serviços',
    summary: 'Corte, barba, manicure… cada serviço tem preço e duração.',
    steps: [
      'Vá em Serviços e clique em Novo serviço.',
      'Informe nome, categoria (ex.: Cabelo, Barbearia, Unhas), preço e tempo em minutos.',
      'Esses dados alimentam a agenda e o valor previsto no painel.',
    ],
    to: '/app/servicos',
    cta: 'Ir para serviços',
  },
  {
    id: 'pros',
    title: '3. Cadastre a equipe',
    summary: 'Profissionais que atendem no salão ou na barbearia.',
    steps: [
      'Em Profissionais, adicione cada pessoa da equipe.',
      'Defina nome, e-mail de acesso, telefone e título (ex.: Barbeiro, Colorista).',
      'Somente administradores podem criar e excluir profissionais.',
    ],
    to: '/app/profissionais',
    cta: 'Ir para profissionais',
  },
  {
    id: 'clients',
    title: '4. Cadastre os clientes',
    summary: 'Telefone validado e preferência de WhatsApp.',
    steps: [
      'Em Clientes, cadastre nome e telefone/celular com DDD.',
      'Marque se o número é WhatsApp e se a pessoa prefere atendimento por mensagem.',
      'O e-mail do cliente é opcional (uso interno) — o contato principal é o WhatsApp.',
    ],
    tip: 'No card do cliente, o botão Mensagem leva direto à aba Comunicações.',
    to: '/app/clientes',
    cta: 'Ir para clientes',
  },
  {
    id: 'agenda',
    title: '5. Monte a agenda',
    summary: 'Crie, confirme, conclua ou cancele horários.',
    steps: [
      'Em Agendamentos (ou no botão + Novo agendamento do painel), escolha cliente, serviço, profissional e horário.',
      'O sistema avisa se o profissional já tem conflito naquele horário.',
      'Use os filtros por status (confirmado, pendente, cancelado, concluído) para organizar o dia.',
    ],
    to: '/app/agenda',
    cta: 'Abrir agenda',
  },
  {
    id: 'messages',
    title: '6. Fale com o cliente',
    summary: 'Centralize a comunicação pelo WhatsApp do salão.',
    steps: [
      'Em Comunicações, configure a Cloud API da Meta no servidor (.env) para envio direto.',
      'Sem a API, ainda é possível abrir o WhatsApp pelo link (modo auxiliar).',
      'Escolha o cliente, um modelo de mensagem (lembrete, confirmação…) e envie.',
    ],
    tip: 'Respostas na janela de 24h após o cliente escrever costumam ser gratuitas na Meta.',
    to: '/app/comunicacoes',
    cta: 'Abrir comunicações',
  },
  {
    id: 'panel',
    title: '7. Acompanhe o painel',
    summary: 'Resumo do dia: horários, receita prevista e próximo cliente.',
    steps: [
      'O Painel mostra quantos atendimentos há hoje e a receita esperada.',
      'Veja a agenda do dia e pule para a lista completa quando quiser.',
      'Volte a este guia sempre que precisar — ele fica em Como usar no menu.',
    ],
    to: '/app',
    cta: 'Ir ao painel',
  },
];

export function isGuideCompleted(): boolean {
  try {
    return localStorage.getItem(GUIDE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGuideCompleted() {
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function resetGuideProgress() {
  try {
    localStorage.removeItem(GUIDE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
