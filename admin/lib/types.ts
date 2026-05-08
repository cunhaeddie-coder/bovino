export interface Admin {
  id: number;
  nome: string;
  email: string;
  papel: "super" | "operador";
  ativo: boolean;
  ultimo_acesso: string | null;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string | null;
  celular: string;
  tipo: string;
  plano: string;
  estado: string | null;
  municipio: string | null;
  verificado_cpf: boolean;
  verificado_celular: boolean;
  bloqueado_ate: string | null;
  deleted_at: string | null;
  created_at: string;
  anuncios_count?: number;
  assinaturas_count?: number;
  assinatura_ativa?: { plano?: { nome: string } } | null;
}

export interface Anuncio {
  id: number;
  titulo: string;
  preco_unitario: number;
  destaque: boolean;
  views: number;
  created_at: string;
  deleted_at: string | null;
  expira_em: string | null;
  user?: { id: number; nome: string; estado: string };
  animal?: { raca: string; sexo: string; quantidade: number; estado: string; municipio: string };
}

export interface Plano {
  id: number;
  slug: string;
  nome: string;
  tipo: string;
  preco: number;
}

export interface Assinatura {
  id: number;
  status: string;
  valor: number;
  inicia_em: string | null;
  expira_em: string | null;
  cancelada_em: string | null;
  created_at: string;
  plano?: Plano;
  assinante?: { nome?: string; empresa?: string; email: string };
}

export interface Pagamento {
  id: number;
  valor: number;
  status: string;
  metodo: string | null;
  gateway_id: string;
  pago_em: string | null;
  created_at: string;
  assinatura?: { plano?: Plano; assinante?: { nome?: string; empresa?: string } };
}

export interface Anunciante {
  id: number;
  empresa: string;
  cnpj: string;
  responsavel: string;
  email: string;
  celular: string;
  estado: string | null;
  ativo: boolean;
  created_at: string;
  banners_count?: number;
  assinatura_ativa?: { plano?: Plano } | null;
}

export interface Banner {
  id: number;
  anunciante_id: number;
  imagem_url: string;
  link_url: string | null;
  posicao: "home" | "feed" | "busca";
  abrangencia: "nacional" | "estadual" | "municipal";
  estados: string[] | null;
  municipios: string[] | null;
  cliques: number;
  impressoes: number;
  ativo: boolean;
  created_at: string;
  anunciante?: { id: number; empresa: string };
}

export interface DashboardStats {
  usuarios: {
    total: number;
    ativos: number;
    novos_hoje: number;
    novos_mes: number;
    por_tipo: Record<string, number>;
  };
  anuncios: { total: number; ativos: number };
  financeiro: {
    mrr: number;
    receita_mes: number;
    receita_mes_anterior: number;
    variacao_receita: number | null;
    assinaturas_ativas: number;
  };
  anunciantes: { total: number; ativos: number };
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
