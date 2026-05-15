# Bovino — Status do Projeto
> Atualizado: 2026-05-14

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| API | Laravel 11 · PHP 8.3 · MySQL · Sanctum · Socialite |
| Web (usuário) | Next.js 16 App Router · React 19 · Tailwind CSS 4 · TypeScript · Zustand · recharts |
| Admin | Next.js 16 App Router (porta 3001) · TypeScript · Tailwind CSS 4 |
| Infra | VPS Linux · Nginx · PM2 · Supervisor (filas) |
| Deploy | GitHub Actions → SSH → `deploy/4_update.sh` |
| Dev local | Laragon · `c:\laragon\www\bovino\` |

**Processos em produção (PM2):**
- `bovino-web` — porta 3000
- `bovino-admin` — porta 3001

**Domínios:**
- `bovino.agr.br` — app do usuário
- `admin.bovino.agr.br` — painel administrativo
- `api.bovino.agr.br` — Laravel API

---

## Forma de Trabalho

- Desenvolvemos via Claude Code no VSCode
- Commits direto na branch `main`
- GitHub Actions faz o deploy automaticamente ao fazer push
- O script `deploy/4_update.sh` executa: `git reset --hard` → `composer install` → `migrate` → `npm build` → `pm2 restart`
- O scheduler do Laravel (`schedule:run`) roda via cron, adicionado automaticamente pelo deploy
- Raiz do projeto: `c:\laragon\www\bovino\`

---

## O Que Está Pronto ✅

### Marketplace
- [x] Listagem de anúncios com busca full-text, filtros (verificado, ESG, raça, estado) e paginação
- [x] Página do anúncio com modal de proposta (`NegociarModal`) e calculadora de arroba
- [x] Sistema de negociações com contra-proposta e calculadora de preço
- [x] Chat completo `/chat/[id]` — bolhas, timeline 4 etapas, respostas rápidas
- [x] Agendamento de visita no chat (`POST /anuncios/{id}/visita`)
- [x] Alerta anti-WhatsApp no chat (regex detecta telefone/email)
- [x] Sistema de avaliações após negociação concluída
- [x] Ranking de top vendedores (`/ranking/vendedores`)

### Cotações
- [x] Preço atual do Boi Gordo Futuro (BGI) direto da B3
- [x] Gráfico histórico BGI com seletor 1S / 1M / 3M / 1A (recharts AreaChart)
- [x] Captura diária automática do ajuste B3 via `php artisan b3:capturar` (13h e 19h)
- [x] Preços CEPEA/ESALQ ao vivo (Boi Gordo, Bezerro, Vaca)
- [x] Histórico de cotações por estado (barra de busca com UF)
- [x] Layout 2 colunas sem scroll no desktop, responsivo no mobile

### Autenticação
- [x] Login com celular + OTP
- [x] Login social com Google (laravel/socialite)
- [x] Heartbeat a cada 60s (`POST /ping`) para detectar usuários online

### Admin
- [x] Lista de clientes com assinatura ativa
- [x] Logs de atividade por usuário (`/admin/clientes/:id/atividade`)
- [x] Painel de usuários online em tempo real
- [x] Dashboard com métricas

### Gestão Pecuária (módulo completo)
- [x] Rebanho, lotes, saúde, pesagens
- [x] Financeiro, fornecedores, insumos, estoque
- [x] Funcionários, prestadores, tarefas
- [x] GTA (Guia de Trânsito Animal)
- [x] Módulo leiteiro, módulo fiscal (LCDPR), reprodução
- [x] Pasto (mapa, trocas, aplicações, coletas)
- [x] App curral (offline sync)
- [x] IA (chat + valor do rebanho)
- [x] Acesso do contador (token temporário)

### Infra / DevOps
- [x] Deploy automático via GitHub Actions + SSH
- [x] Script `4_update.sh` idempotente (cron do Laravel adicionado automaticamente)
- [x] PM2 gerenciando web e admin
- [x] Supervisor para filas do Laravel
- [x] Tema Brasil (paleta verde/amarelo/azul)

---

## O Que Falta ⏳

### Alta prioridade
- [ ] **Bug multi-fazenda:** `GET /fazendas/minhas` retorna 404 em produção (OPcache reiniciado, não resolveu — pendente diagnóstico)
- [ ] **Gráfico B3:** dados históricos ainda sendo acumulados — gráfico aparece automaticamente após alguns dias de captura

### Fase 3 — Pagamentos (aguarda contrato BaaS)
- [ ] Escrow / split de pagamento entre comprador e vendedor
- [ ] Confirmação de recebimento / liberação de fundos
- [ ] Integração Celcoin ou Asaas (a definir)

### Verificação de identidade
- [ ] Selfie + documento via BaaS (`status_selfie` já existe no banco, UI mostra "em breve")
- [ ] Aguarda parceiro de BaaS / KYC definido

### Melhorias futuras (backlog)
- [ ] Notificações push (PWA/FCM)
- [ ] App mobile nativo (pós-validação web)
- [ ] Leilão ao vivo (WebSockets)
- [ ] Integração com corretores certificados

---

## Arquivos-chave

```
bovino/
├── api/
│   ├── app/Http/Controllers/Api/   — controllers REST
│   ├── app/Console/Commands/       — CapturarB3.php (agendado)
│   ├── routes/api.php              — todas as rotas
│   └── routes/console.php          — schedule (b3:capturar)
├── web/
│   └── app/(main)/
│       ├── cotacoes/               — page.tsx + B3Chart.tsx
│       └── chat/[id]/              — chat de negociação
├── admin/
│   └── app/                        — painel admin
└── deploy/
    └── 4_update.sh                 — script de deploy
```
