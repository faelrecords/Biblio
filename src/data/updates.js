export const updates = [
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
