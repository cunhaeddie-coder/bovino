export interface Animal {
  id: number;
  raca: string;
  sexo: "macho" | "femea" | "misto";
  idade_meses: number | null;
  peso_estimado: number | null;
  quantidade: number;
  estado: string;
  municipio: string;
  propriedade: string | null;
  status: "disponivel" | "vendido" | "reservado";
}

export interface Midia {
  id: number;
  tipo: "foto" | "video";
  url: string;
  thumbnail_url: string | null;
  ordem: number;
}

export interface Anuncio {
  id: number;
  user_id: number;
  titulo: string;
  descricao: string | null;
  preco_unitario: number;
  aceita_negociacao: boolean;
  destaque: boolean;
  is_elite: boolean | null;
  views: number;
  expira_em: string | null;
  created_at: string;
  animal: Animal;
  fotos: Midia[];
  midias?: Midia[];
  user?: {
    id: number;
    nome: string;
    estado: string;
    municipio: string;
    plano: string;
    verificado_cpf: boolean;
    verificado_celular: boolean;
    kyc?: {
      kyc_status: string;
      status_receita: string;
      status_ie: string;
      status_ibama: string;
    };
  };
}

export interface Cotacao {
  id: number;
  tipo: "boi_gordo" | "bezerro" | "vaca";
  preco_arroba: number;
  fonte: string;
  estado: string | null;
  referencia_em: string;
}

export interface Negociacao {
  id: number;
  anuncio_id: number;
  status: "aberta" | "aceita" | "recusada" | "concluida";
  preco_proposto: number | null;
  mensagem_inicial: string | null;
  created_at: string;
  anuncio?: Partial<Anuncio>;
  comprador?: { id: number; nome: string };
  vendedor?: { id: number; nome: string };
}

export interface Mensagem {
  id: number;
  negociacao_id: number;
  corpo: string;
  lido_em: string | null;
  created_at: string;
  remetente: { id: number; nome: string };
}

export interface Plano {
  id: number;
  slug: string;
  nome: string;
  tipo: "comprador" | "produtor" | "anunciante";
  preco: number;
  periodo: string;
  ordem: number;
  max_anuncios: number;
  max_destaques: number;
  ver_contato_vendedor: boolean;
  alertas_preco: boolean;
  analytics: boolean;
  badge_verificado: boolean;
  suporte_prioritario: boolean;
  recursos: string[];
}

export interface Assinatura {
  id: number;
  plano_id: number;
  status: "pendente" | "ativa" | "cancelada" | "expirada";
  valor: number;
  inicia_em: string | null;
  expira_em: string | null;
  cancelada_em: string | null;
  plano?: Plano;
}

export interface Anunciante {
  id: number;
  empresa: string;
  cnpj: string;
  responsavel: string;
  celular: string;
  email: string;
  logo_url: string | null;
  site: string | null;
  estado: string | null;
  descricao: string | null;
  ativo: boolean;
}

export interface Banner {
  id: number;
  titulo: string;
  imagem_url: string;
  link_url: string;
  posicao: "home" | "feed" | "busca";
  estado: string | null;
  impressoes: number;
  cliques: number;
  ativo: boolean;
  inicia_em: string | null;
  expira_em: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
