# Bovino — Status & Configuração
> Atualizado: 2026-05-14

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
| Host prod | 127.0.0.1 |
| Porta | 3306 |
| Banco | bovino |
| Usuário | [PREENCHER] |
| Senha | [PREENCHER] |
| Banco local | bovino (Laragon) |
| Usuário local | root / sem senha |

---

## 3. Repositório & Deploy

| Item | Valor |
|------|-------|
| GitHub | https://github.com/cunhaeddie-coder/bovino.git |
| Branch principal | main |
| Deploy | GitHub Actions → SSH → `deploy/4_update.sh` |
| Secret GH `SSH_PRIVATE_KEY` | chave privada (base64) do root@2.24.75.211 |
| Trigger | push na branch main |

---

## 4. Formas de Envio

### 4.1 WhatsApp — Z-API (OTP e notificações)

| Variável | Valor |
|----------|-------|
| `ZAPI_INSTANCE_ID` | [PREENCHER] |
| `ZAPI_TOKEN` | [PREENCHER] |
| `ZAPI_CLIENT_TOKEN` | [PREENCHER] |
| Painel Z-API | https://app.z-api.io |
| Uso | Envio de OTP de login · Notificações de negociação |

> Se Z-API não estiver configurado, o backend retorna `codigo_manual`
> e o frontend exibe o código na tela + botão "Copiar mensagem WhatsApp".

### 4.2 SMS — Twilio (fallback quando Z-API falha)

| Variável | Valor |
|----------|-------|
| `TWILIO_SID` | [PREENCHER] |
| `TWILIO_TOKEN` | [PREENCHER] |
| `TWILIO_FROM` | [PREENCHER] (número +55...) |
| Painel | https://console.twilio.com |
| Uso | Fallback de OTP via SMS |

### 4.3 E-mail — Laravel Mail

| Variável | Valor |
|----------|-------|
| `MAIL_MAILER` | [PREENCHER] (smtp / mailgun / resend) |
| `MAIL_HOST` | [PREENCHER] |
| `MAIL_PORT` | [PREENCHER] (587 / 465) |
| `MAIL_USERNAME` | [PREENCHER] |
| `MAIL_PASSWORD` | [PREENCHER] |
| `MAIL_ENCRYPTION` | tls |
| `MAIL_FROM_ADDRESS` | noreply@bovino.agr.br |
| `MAIL_FROM_NAME` | Bovino |
| Uso | Confirmações, recuperação de senha, recibos |

> Local: `MAIL_MAILER=log` (emails vão para `storage/logs/laravel.log`)

---

## 5. Pagamentos

### 5.1 Mercado Pago (PIX)

| Variável | Local (TEST) | Produção |
|----------|-------------|----------|
| `MERCADO_PAGO_PUBLIC_KEY` | TEST-a26d862e-fda4-48db-bdc9-dde79b023e6c | [PREENCHER] |
| `MERCADO_PAGO_ACCESS_TOKEN` | TEST-4053692117695540-050715-... | [PREENCHER] |
| Painel | https://www.mercadopago.com.br/developers | |
| Webhook URL | https://api.bovino.agr.br/api/webhook/mercadopago | |

### 5.2 Stripe (Cartão crédito/débito)

| Variável | Valor |
|----------|-------|
| `STRIPE_PUBLIC_KEY` | [PREENCHER] (pk_live_...) |
| `STRIPE_SECRET_KEY` | [PREENCHER] (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | [PREENCHER] (whsec_...) |
| Painel | https://dashboard.stripe.com |
| Webhook URL | https://api.bovino.agr.br/api/webhook/stripe |
| Eventos escutados | payment_intent.succeeded · invoice.payment_succeeded · invoice.payment_failed · customer.subscription.deleted |

---

## 6. Armazenamento de Mídia — Cloudflare R2

| Variável | Valor |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | [PREENCHER] |
| `AWS_SECRET_ACCESS_KEY` | [PREENCHER] |
| `AWS_DEFAULT_REGION` | auto |
| `AWS_BUCKET` | bovino |
| `AWS_ENDPOINT` | [PREENCHER] (https://...r2.cloudflarestorage.com) |
| `AWS_USE_PATH_STYLE_ENDPOINT` | true |
| Painel | https://dash.cloudflare.com |
| Uso | Upload de fotos de animais, documentos KYC, mídias de anúncios |

---

## 7. Inteligência Artificial — Anthropic

| Variável | Valor |
|----------|-------|
| `ANTHROPIC_API_KEY` | [PREENCHER] (sk-ant-...) |
| Modelo | claude-haiku-4-5-20251001 |
| Painel | https://console.anthropic.com |
| Uso | Chat IA do gestor · Avaliação de valor do rebanho |

---

## 8. Autenticação Social — Google OAuth

| Variável | Valor |
|----------|-------|
| `GOOGLE_CLIENT_ID` | [PREENCHER] |
| `GOOGLE_CLIENT_SECRET` | [PREENCHER] |
| `GOOGLE_REDIRECT_URI` | https://api.bovino.agr.br/api/v1/auth/google/callback |
| Painel | https://console.cloud.google.com |

---

## 9. Admin

| Item | Valor |
|------|-------|
| URL | https://admin.bovino.agr.br |
| E-mail | admin@bovino.com.br |
| Senha | admin@2026 |

---

## 10. O Que Está Pronto ✅

### Marketplace
- [x] Listagem com busca full-text, filtros (verificado, ESG, raça, estado) e paginação
- [x] Página do anúncio com modal de proposta e calculadora de arroba
- [x] Sistema de negociações com contra-proposta
- [x] Chat completo `/chat/[id]` — bolhas, timeline 4 etapas, respostas rápidas
- [x] Agendamento de visita no chat
- [x] Alerta anti-WhatsApp (regex detecta telefone/email)
- [x] Sistema de avaliações pós-negociação
- [x] Ranking de top vendedores

### Cotações
- [x] Preço atual BGI direto da B3 (cache 15 min)
- [x] Gráfico histórico BGI — seletor 1S/1M/3M/1A (recharts)
- [x] Captura diária automática 13h e 19h (`php artisan b3:capturar`)
- [x] Preços CEPEA/ESALQ (Boi Gordo, Bezerro, Vaca)
- [x] Histórico de cotações por estado
- [x] Layout 2 colunas sem scroll no desktop, responsivo no mobile

### Autenticação
- [x] Login celular + OTP
- [x] Login social Google
- [x] Heartbeat 60s para detectar usuários online

### Admin
- [x] Lista de clientes com assinatura ativa
- [x] Logs de atividade por usuário
- [x] Painel de usuários online em tempo real
- [x] Dashboard com métricas

### Gestão Pecuária
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
- [x] Deploy automático GitHub Actions + SSH
- [x] PM2 + Supervisor + cron do scheduler
- [x] Tema Brasil (paleta verde/amarelo/azul)

---

## 11. O Que Falta ⏳

### Alta prioridade
- [ ] **Bug multi-fazenda:** `GET /fazendas/minhas` → 404 em produção (OPcache reiniciado, não resolveu)
- [ ] **Gráfico B3:** dados acumulando — gráfico aparece automaticamente em alguns dias

### Fase 3 — Pagamentos (aguarda contrato BaaS)
- [ ] Escrow / split entre comprador e vendedor
- [ ] Confirmação de recebimento / liberação de fundos
- [ ] Integração Celcoin ou Asaas (a definir)

### Verificação de identidade
- [ ] Selfie + documento via BaaS (campo `status_selfie` existe no banco, UI mostra "em breve")
- [ ] Aguarda parceiro BaaS/KYC definido

### Backlog
- [ ] Notificações push (PWA/FCM)
- [ ] App mobile nativo (pós-validação web)
- [ ] Leilão ao vivo (WebSockets)
- [ ] Integração com corretores certificados

---

## 12. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| API | Laravel 11 · PHP 8.3 · MySQL · Sanctum · Socialite |
| Web | Next.js 16 App Router · React 19 · Tailwind CSS 4 · TypeScript · Zustand · recharts |
| Admin | Next.js 16 App Router (porta 3001) |
| Infra | VPS Linux · Nginx · PM2 · Supervisor (filas) |
| Deploy | GitHub Actions → SSH → `deploy/4_update.sh` |
| Dev local | Laragon · `c:\laragon\www\bovino\` |

### Forma de trabalho
- Commits direto na branch `main`
- GitHub Actions faz deploy automático ao fazer push
- Deploy: `git reset --hard` → `composer install` → `migrate` → `npm build` → `pm2 restart`
- Scheduler Laravel via cron, adicionado automaticamente pelo deploy script

---

## 13. Arquivos-chave

```
bovino/
├── api/
│   ├── .env                            variáveis de ambiente (não commitado)
│   ├── app/Http/Controllers/Api/       controllers REST
│   ├── app/Console/Commands/           CapturarB3.php (agendado)
│   ├── routes/api.php                  todas as rotas
│   └── routes/console.php              schedule (b3:capturar 13h e 19h)
├── web/
│   └── app/(main)/
│       ├── cotacoes/                   page.tsx + B3Chart.tsx
│       └── chat/[id]/                  chat de negociação
├── admin/
│   └── app/                            painel admin
├── deploy/
│   └── 4_update.sh                     script de deploy
└── STATUS.md                           este arquivo
```

---

## 14. Planos e Preços

| Plano | Preço/mês |
|-------|-----------|
| comprador-premium | R$ 30 |
| produtor-basico | R$ 50 |
| produtor-premium | R$ 100 |
| produtor-elite | R$ 200 |
| anunciante-regional | R$ 500 |
| anunciante-nacional | R$ 1.000 |
| anunciante-nacional-premium | R$ 2.000 |
