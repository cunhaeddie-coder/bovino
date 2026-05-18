# Bovino — Status & Configuração
> Atualizado: 2026-05-18

---

## 1. Infraestrutura — Hostinger

| Item | Valor |
|------|-------|
| Provedor | Hostinger KVM2 |
| Painel VPS | https://bos2.hostingervps.com/3085/ |
| IP público | 2.24.75.211 |
| SO | Ubuntu 22.04 LTS |
| Recursos | 2 vCPU · 8 GB RAM · 100 GB SSD |
| SSH | `ssh root@2.24.75.211` |
| Senha root SSH | [PREENCHER] |
| Raiz do projeto | `/var/www/bovino` |

### DNS (registro.br → todos apontam para 2.24.75.211)

| Registro | Tipo | Destino |
|----------|------|---------|
| bovino.agr.br | A | 2.24.75.211 |
| www.bovino.agr.br | A | 2.24.75.211 |
| api.bovino.agr.br | A | 2.24.75.211 |
| admin.bovino.agr.br | A | 2.24.75.211 |

### Serviços em execução

| Serviço | Processo | Porta | URL |
|---------|----------|-------|-----|
| App usuário (Next.js) | PM2 `bovino-web` | 3000 | https://bovino.agr.br |
| Painel admin (Next.js) | PM2 `bovino-admin` | 3001 | https://admin.bovino.agr.br |
| API Laravel | PHP-FPM + Nginx | 80/443 | https://api.bovino.agr.br |
| Fila Laravel | PM2 `bovino-queue` | — | queue:work |
| Scheduler | Cron `* * * * *` | — | schedule:run |

---

## 2. Banco de Dados

| Item | Valor |
|------|-------|
| Motor | MySQL 8 |
| Host prod | 127.0.0.1:3306 |
| Banco | bovino |
| Usuário | [PREENCHER] |
| Senha | [PREENCHER] |
| Local | root / sem senha (Laragon) |

---

## 3. Repositório & Deploy

| Item | Valor |
|------|-------|
| GitHub | https://github.com/cunhaeddie-coder/bovino.git |
| Branch | main |
| Deploy | GitHub Actions → SSH → `deploy/4_update.sh` |
| Secret GH | `SSH_PRIVATE_KEY` (chave privada base64) |
| Trigger | push na branch main |

---

## 4. Formas de Envio

### 4.1 WhatsApp — Z-API
| Variável | Valor |
|----------|-------|
| `ZAPI_INSTANCE_ID` | [PREENCHER] |
| `ZAPI_TOKEN` | [PREENCHER] |
| `ZAPI_CLIENT_TOKEN` | [PREENCHER] |
| Painel | https://app.z-api.io |

> Se não configurado: backend retorna `codigo_manual`, frontend exibe + botão copiar WhatsApp.

### 4.2 SMS — Twilio (fallback)
| `TWILIO_SID` | `TWILIO_TOKEN` | `TWILIO_FROM` | Painel |
|---|---|---|---|
| [PREENCHER] | [PREENCHER] | [PREENCHER] | https://console.twilio.com |

### 4.3 E-mail — Laravel Mail
| Variável | Valor |
|----------|-------|
| `MAIL_MAILER` | [PREENCHER] (smtp/mailgun/resend) |
| `MAIL_HOST` | [PREENCHER] |
| `MAIL_PORT` | [PREENCHER] (587/465) |
| `MAIL_USERNAME` | [PREENCHER] |
| `MAIL_PASSWORD` | [PREENCHER] |
| `MAIL_FROM_ADDRESS` | noreply@bovino.agr.br |

> Local: `MAIL_MAILER=log`

---

## 5. Pagamentos

### 5.1 Mercado Pago (PIX)
| Variável | Local (TEST) | Produção |
|----------|-------------|----------|
| `MERCADO_PAGO_PUBLIC_KEY` | TEST-a26d862e-... | [PREENCHER] |
| `MERCADO_PAGO_ACCESS_TOKEN` | TEST-4053692117695540-... | [PREENCHER] |
| Webhook | https://api.bovino.agr.br/api/webhook/mercadopago | |

### 5.2 Stripe (Cartão)
| Variável | Valor |
|----------|-------|
| `STRIPE_PUBLIC_KEY` | [PREENCHER] (pk_live_...) |
| `STRIPE_SECRET_KEY` | [PREENCHER] (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | [PREENCHER] (whsec_...) |
| Webhook | https://api.bovino.agr.br/api/webhook/stripe |

---

## 6. Outros Serviços

| Serviço | Variáveis | Painel |
|---------|-----------|--------|
| Cloudflare R2 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET=bovino`, `AWS_ENDPOINT` | https://dash.cloudflare.com |
| Anthropic IA | `ANTHROPIC_API_KEY` (sk-ant-...) | https://console.anthropic.com |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | https://console.cloud.google.com |

---

## 7. Admin

| URL | E-mail | Senha |
|-----|--------|-------|
| https://admin.bovino.agr.br | admin@bovino.com.br | admin@2026 |

---

## 8. O Que Está Pronto ✅

### Marketplace
- [x] Listagem com busca full-text, filtros (verificado, ESG, raça, estado) e paginação
- [x] Página do anúncio com modal de proposta e calculadora de arroba
- [x] Negociações com contra-proposta e calculadora de preço
- [x] Chat `/chat/[id]` — bolhas, timeline 4 etapas, respostas rápidas
- [x] Agendamento de visita no chat
- [x] Alerta anti-WhatsApp (regex detecta telefone/email)
- [x] Sistema de avaliações pós-negociação
- [x] Ranking de top vendedores

### Cotações
- [x] Preço BGI B3 em tempo real (cache 15 min) + gráfico histórico 1S/1M/3M/1A
- [x] Captura diária automática do ajuste B3 (13h e 19h via `b3:capturar`)
- [x] Preços CEPEA/ESALQ (Boi Gordo, Bezerro, Vaca) + histórico por estado
- [x] **Mercado Agora** — cotação B3+CEPEA integrada no painel de gestão

### Autenticação
- [x] Login celular + OTP, Login social Google, Heartbeat 60s (usuários online)

### Admin
- [x] Lista de clientes, logs de atividade, usuários online em tempo real, dashboard

### Gestão Pecuária — Módulos base
- [x] Rebanho, Lotes, Saúde, Pesagens, GTA
- [x] Financeiro (receitas, custos, contas, fluxo de caixa)
- [x] **Painel do Caixa** — gráfico recharts Receitas vs Custos por mês
- [x] **Importar Nota Fiscal** — upload XML NF-e, parse no browser, cria custo
- [x] Fornecedores, Insumos/Estoque, Funcionários, Tarefas
- [x] Módulo Leiteiro, Fiscal (LCDPR), Reprodução, Arrendamentos
- [x] Pasto (mapa, trocas, aplicações, coletas)
- [x] App Curral (offline sync), App Pasto
- [x] IA Gestor (chat + valor do rebanho)
- [x] Acesso do Contador (token temporário)

### Gestão Pecuária — Novos módulos (competitivos)
- [x] **Evolução do Lote** — GMD por lote (Penúlt./Últ./Total) nos cards de lotes
- [x] **Projeção de Venda** — simula receita, lucro, preço equilíbrio e meta por lote
- [x] **BoviScore** — índice 0-100 de performance da fazenda (4 componentes)
- [x] **Banco Genético** — estoque de sêmen com controle de doses por touro/raça/RGD
- [x] **Plano Nutricional** — protocolos alimentares com ingredientes e custo/animal/dia
- [x] **Entradas e Saídas** — aquisições, vendas e perdas/mortes consolidadas

### Central de Análises — /gestao/inteligencia (7 ferramentas)
- [x] **Projeção de Venda** — simulador financeiro por lote
- [x] **Minha @ vs Mercado** — preço dos lotes vs B3 e CEPEA
- [x] **Raças em Números** — GMD, peso médio e preço por raça
- [x] Cotações do Mercado, Mapa de Demanda, Alertas de Demanda, Entradas e Saídas

### Infra / DevOps
- [x] Deploy automático GitHub Actions + SSH (base64 key)
- [x] Script deploy idempotente (cron do scheduler adicionado automaticamente)
- [x] Tema Brasil, PM2 + Supervisor

---

## 9. O Que Falta ⏳

### Bugs pendentes
- [ ] **Bug multi-fazenda:** `GET /fazendas/minhas` → 404 em produção (OPcache não resolveu)
- [ ] **Gráfico B3:** dados acumulando via cron — aparece automaticamente em alguns dias

### Fase 3 — Pagamentos (aguarda contrato BaaS)
- [ ] Escrow / split comprador-vendedor
- [ ] Confirmação de recebimento / liberação de fundos
- [ ] Parceiro BaaS: Celcoin ou Asaas (a definir)

### Verificação de identidade (KYC)
- [ ] Selfie + documento via BaaS (campo `status_selfie` existe, UI "em breve")
- [ ] Aguarda parceiro BaaS/KYC definido

### Análises — ainda pendentes
- [ ] **Desempenho por Origem** — GMD por fazenda/vendedor de origem dos animais (requer campo `procedencia` no rebanho)
- [ ] **Campo Escola** — plataforma educativa para clientes (reduz churn)
- [ ] **Curral de Engorda** — módulo de confinamento intensivo (add-on pago)
- [ ] **Plano por Rebanho** — precificação dinâmica por qtd de animais

### Backlog (futuro)
- [ ] Notificações push (PWA/FCM)
- [ ] App mobile nativo (pós-validação web)
- [ ] Leilão ao vivo (WebSockets)
- [ ] Integração com corretores certificados
- [ ] Módulo de Melhoramento Genético (ANCP, ABCZ)
- [ ] Integração IoT/RFID (balanças eletrônicas, leitores de brinco)

---

## 10. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| API | Laravel 11 · PHP 8.3 · MySQL · Sanctum · Socialite |
| Web | Next.js 16 App Router · React 19 · Tailwind CSS 4 · TypeScript · Zustand · recharts |
| Admin | Next.js 16 App Router (porta 3001) |
| Infra | VPS Linux · Nginx · PM2 · Supervisor (filas) |
| Deploy | GitHub Actions → SSH → `deploy/4_update.sh` |
| Dev local | Laragon · `c:\laragon\www\bovino\` |

**Forma de trabalho:**
- Commits direto na `main` → GitHub Actions deploya automaticamente
- Deploy: `git reset --hard` → `composer install` → `migrate` → `npm build` → `pm2 restart`
- Scheduler via cron, adicionado pelo deploy script (idempotente)

---

## 11. Arquivos-chave

```
bovino/
├── api/
│   ├── app/Http/Controllers/Api/
│   │   ├── BoviScoreController.php          score 0-100 da fazenda
│   │   ├── BancoGeneticoController.php      estoque de sêmen
│   │   ├── PlanoNutricionalController.php   protocolos alimentares
│   │   ├── GestaoAnalisesController.php     minha @ vs mercado, raças
│   │   ├── GestaoMovimentacoesController.php entradas e saídas
│   │   └── CotacaoController.php            B3 + CEPEA + histórico
│   ├── app/Console/Commands/CapturarB3.php  captura diária do ajuste BGI
│   ├── routes/api.php                       todas as rotas
│   └── routes/console.php                  schedule (b3:capturar 13h/19h)
├── web/
│   └── app/(main)/gestao/
│       ├── page.tsx                         painel com BoviScore + Mercado Agora
│       ├── lotes/page.tsx                   Evolução do Lote (GMD)
│       ├── financeiro/page.tsx              Painel do Caixa + NF-e
│       ├── genetica/page.tsx                Banco Genético
│       ├── nutricional/page.tsx             Plano Nutricional
│       ├── movimentacoes/page.tsx           Entradas e Saídas
│       └── inteligencia/
│           ├── page.tsx                     hub com 7 ferramentas
│           ├── projecao-venda/              Projeção de Venda
│           ├── minha-arroba/                Minha @ vs Mercado
│           └── racas/                       Raças em Números
├── admin/app/                               painel admin
├── deploy/4_update.sh                       script de deploy
└── STATUS.md                               este arquivo
```

---

## 12. Planos e Preços

| Plano | Preço/mês |
|-------|-----------|
| comprador-premium | R$ 30 |
| produtor-basico | R$ 50 |
| produtor-premium | R$ 100 |
| produtor-elite | R$ 200 |
| anunciante-regional | R$ 500 |
| anunciante-nacional | R$ 1.000 |
| anunciante-nacional-premium | R$ 2.000 |
