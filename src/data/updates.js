export const updates = [
  {
    version: 'v1.6.23',
    date: '2026-08-03',
    title: 'Correção no reajuste de prazo',
    summary: 'O prazo de empréstimos ativos volta a ser salvo corretamente.',
    items: [
      'Reajustar prazo não tenta mais aprovar novamente um empréstimo já ativo.',
      'O novo prazo aceita entre 1 e 90 dias e reinicia os lembretes de vencimento.'
    ]
  },
  {
    version: 'v1.6.22',
    date: '2026-07-30',
    title: 'Envio opcional para o Bitrix24',
    summary: 'Cada mensagem pode permanecer somente no Biblio ou também seguir para o Bitrix24.',
    items: [
      'Avisos exclusivos ganharam o controle “Enviar no Bitrix?”.',
      'Cada automação possui sua própria preferência entre Biblio ou Biblio + Bitrix.',
      'O envio e o registro da notificação no Biblio continuam obrigatórios.'
    ]
  },
  {
    version: 'v1.6.21',
    date: '2026-07-30',
    title: 'Dias com concordância correta',
    summary: 'A variável de prazo agora retorna uma expressão completa.',
    items: [
      'A variável {dias} exibe “1 dia” no singular e “N dias” nos demais casos.',
      'Mensagens antigas com “{dias} dia(s)” são corrigidas automaticamente para evitar repetição.'
    ]
  },
  {
    version: 'v1.6.20',
    date: '2026-07-30',
    title: 'Identificação obrigatória do remetente',
    summary: 'Os avisos agora mostram automaticamente quem realizou o envio.',
    items: [
      'A linha “Enviado por” usa o nome do administrador autenticado e não pode ser editada.',
      'No Bitrix24, “Enviado por:” aparece em negrito e vermelho, seguido do nome normal do administrador.',
      'Dentro do Biblio, o aviso e a identificação do remetente também são exibidos por padrão.',
      'Automações usam o administrador que salvou a configuração; enquanto não forem salvas novamente, aparecem como enviadas pelo Sistema.'
    ]
  },
  {
    version: 'v1.6.19',
    date: '2026-07-30',
    title: 'Alerta visual no Bitrix24',
    summary: 'O cabeçalho dos avisos ficou mais fácil de identificar.',
    items: [
      'O título vermelho “Aviso da Biblioteca” agora exibe um símbolo de alerta em cada lado.'
    ]
  },
  {
    version: 'v1.6.18',
    date: '2026-07-30',
    title: 'Cabeçalho padrão das notificações',
    summary: 'Avisos no Bitrix24 agora recebem um cabeçalho destacado e fixo.',
    items: [
      'Todas as mensagens enviadas ao Bitrix24 usam o cabeçalho vermelho e em negrito “Aviso da Biblioteca”.',
      'Os avisos gerais e exclusivos não permitem mais alterar o título.',
      'As automações agora exibem somente o campo Mensagem, com título definido automaticamente.'
    ]
  },
  {
    version: 'v1.6.17',
    date: '2026-07-30',
    title: 'Variáveis individuais restauradas',
    summary: 'Mais liberdade para montar os avisos exclusivos.',
    items: [
      'Os atalhos {livro}, {dias} e {data_devolucao} voltaram ao card de variáveis.',
      'A variável agrupada {emprestimo} continua disponível junto às variáveis individuais.'
    ]
  },
  {
    version: 'v1.6.16',
    date: '2026-07-30',
    title: 'Atalhos de variáveis no aviso',
    summary: 'O aviso exclusivo ficou mais simples e rápido de preencher.',
    items: [
      'As variáveis agora são botões que inserem o campo exatamente na posição do cursor.',
      'O aviso exclusivo passou a ter apenas o campo Mensagem.',
      'A variável {emprestimo} reúne livro, data de devolução e dias restantes de todos os empréstimos ativos.'
    ]
  },
  {
    version: 'v1.6.15',
    date: '2026-07-30',
    title: 'Variáveis nos avisos exclusivos',
    summary: 'Avisos manuais agora podem usar dados do usuário e do empréstimo.',
    items: [
      'Avisos exclusivos substituem variáveis de usuário, email, livro, dias restantes e data de devolução.',
      'O formulário permite selecionar um empréstimo ativo para preencher os dados do livro.',
      'Um novo card ao lado do aviso explica todas as variáveis disponíveis.',
      'A criação de automações extras foi temporariamente desabilitada.'
    ]
  },
  {
    version: 'v1.6.14',
    date: '2026-07-30',
    title: 'Central de automações',
    summary: 'Mensagens automáticas configuráveis para empréstimos e fila.',
    items: [
      'Nova aba Automações com ativação individual, mensagens editáveis e regras personalizadas.',
      'Automação configurável para empréstimos próximos do vencimento.',
      'Automação para avisar o próximo da fila assim que o livro for devolvido.',
      'A logo Biblio agora mostra ou esconde as abas do menu administrativo.'
    ]
  },
  {
    version: 'v1.6.13',
    date: '2026-07-30',
    title: 'Avisos exclusivos no Bitrix24',
    summary: 'Integração liberada para todos os destinatários cadastrados.',
    items: [
      'Administradores podem enviar avisos exclusivos para qualquer usuário no Biblio e no Bitrix24.',
      'O destinatário no Bitrix24 é localizado pelo mesmo email cadastrado no Biblio.'
    ]
  },
  {
    version: 'v1.6.12',
    date: '2026-07-30',
    title: 'Aviso exclusivo no Bitrix24',
    summary: 'Teste de integração entre o Biblio e o chat corporativo.',
    items: [
      'Avisos exclusivos enviados ao usuário Rafael também são encaminhados ao chat do Bitrix24.',
      'O administrador recebe a confirmação do envio ou uma mensagem de falha da integração.'
    ]
  },
  {
    version: 'v1.6.11',
    date: '2026-07-30',
    title: 'Reajuste de prazo',
    summary: 'Mais controle sobre os empréstimos ativos.',
    items: [
      'Administradores podem reajustar os dias de empréstimo de um livro.',
      'O novo prazo pode ser definido entre 1 e 90 dias.'
    ]
  },
  {
    version: 'v1.6.10',
    date: '2026-06-01',
    title: 'Texto de presença',
    summary: 'Ajuste fino no status online de usuários.',
    items: [
      'Status online agora mostra quantos minutos se passaram.'
    ]
  },
  {
    version: 'v1.6.9',
    date: '2026-06-01',
    title: 'Presença de usuários',
    summary: 'Ajuste na exibição da última atividade.',
    items: [
      'Último online mostra minutos ou horas nas primeiras 24 horas.',
      'Após 24 horas, exibe data e hora completas.'
    ]
  },
  {
    version: 'v1.6.8',
    date: '2026-06-01',
    title: 'Status online',
    summary: 'Melhoria visual na aba Usuários.',
    items: [
      'Usuários ativos nos últimos 5 minutos aparecem como online agora.'
    ]
  },
  {
    version: 'v1.6.7',
    date: '2026-06-01',
    title: 'Usuários mais rastreáveis',
    summary: 'Melhorias na administração de usuários.',
    items: [
      'Aba Usuários mostra última vez online.',
      'Aba Usuários ganhou busca por nome ou email.'
    ]
  },
  {
    version: 'v1.6.6',
    date: '2026-05-15',
    title: 'Menu administrativo',
    summary: 'Ajuste no menu do painel em computadores.',
    items: [
      'Novo toggle para esconder ou mostrar abas do menu admin.',
      'Preferência fica salva no navegador.'
    ]
  },
  {
    version: 'v1.6.5',
    date: '2026-05-13',
    title: 'Gestão de feedback',
    summary: 'Controle administrativo para limpar registros de feedback.',
    items: [
      'Administradores podem excluir sugestões.',
      'Administradores podem excluir avaliações.'
    ]
  },
  {
    version: 'v1.6.4',
    date: '2026-05-13',
    title: 'Modais mais seguros',
    summary: 'Ajuste para evitar fechamento acidental de janelas.',
    items: [
      'Cliques fora dos modais nao fecham mais a janela.',
      'Fechamento continua pelos botoes proprios.'
    ]
  },
  {
    version: 'v1.6.3',
    date: '2026-05-13',
    title: 'Sessão mais estável',
    summary: 'Ajuste para manter login ativo ao recarregar a página.',
    items: [
      'Sessão persistente corrigida para recarregamentos com F5 e Ctrl+F5.',
      'Leitura do token de acesso ficou mais robusta.'
    ]
  },
  {
    version: 'v1.6.2',
    date: '2026-05-13',
    title: 'Catálogo mais prático',
    summary: 'Melhorias na experiência de leitura e descoberta de livros.',
    items: [
      'Saudação muda conforme horário: bom dia, boa tarde ou boa noite.',
      'Frase de incentivo muda a cada acesso.',
      'Botão Me surpreenda recomenda um livro aleatório.',
      'Botão Enviar sugestão ficou mais destacado.'
    ]
  },
  {
    version: 'v1.6.1',
    date: '2026-05-13',
    title: 'Ajustes administrativos',
    summary: 'Melhorias visuais e histórico de mudanças para administradores.',
    items: [
      'Nova aba Updates para acompanhar novidades do sistema.',
      'Categorias em Configurações agora aparecem como etiquetas.',
      'Cadastro de categoria ficou mais compacto.'
    ]
  },
  {
    version: 'v1.6.0',
    date: '2026-05-13',
    title: 'Sugestões, avaliações e avisos',
    summary: 'Novas ferramentas para feedback dos usuários e comunicação da biblioteca.',
    items: [
      'Usuários podem enviar sugestões pelo catálogo.',
      'Administradores têm abas de Sugestões e Avaliações.',
      'Devolução agora pede nota de 1 a 5 e comentário opcional.',
      'Livros exibem média de avaliações.',
      'Avisos exclusivos por usuário e aviso geral da biblioteca.'
    ]
  },
  {
    version: 'v1.5.0',
    date: '2026-05-13',
    title: 'Configurações e categorias',
    summary: 'Organização das opções administrativas em área própria.',
    items: [
      'Nova aba Configurações.',
      'Cadastro de categorias pelo admin.',
      'Cadastro de livro usa dropdown de categoria.',
      'Busca em tempo real no catálogo por título, autor ou categoria.'
    ]
  },
  {
    version: 'v1.4.0',
    date: '2026-05-12',
    title: 'Login e primeiro acesso',
    summary: 'Fluxo de acesso mais controlado para usuários e administradores.',
    items: [
      'Removido acesso sem login.',
      'Usuários criados por admin recebem senha temporária.',
      'Primeiro acesso obriga cadastro de código e troca de senha.',
      'Administradores entram direto no painel.'
    ]
  }
];
