<?php

namespace App\Services;

use App\Models\Assinatura;
use App\Models\Pagamento;
use App\Models\Plano;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoService
{
    private string $baseUrl = 'https://api.mercadopago.com';
    private string $token;

    public function __construct()
    {
        $this->token = config('services.mercadopago.access_token', '');
    }

    /**
     * Cria uma preference de pagamento (checkout) para assinatura.
     */
    public function criarPreference(Assinatura $assinatura): array
    {
        $plano = $assinatura->plano;
        $assinante = $assinatura->assinante;

        $payload = [
            'items' => [[
                'id' => $plano->slug,
                'title' => "Bovino — {$plano->nome}",
                'description' => "Assinatura mensal plano {$plano->nome}",
                'quantity' => 1,
                'currency_id' => 'BRL',
                'unit_price' => (float) $plano->preco,
            ]],
            'payer' => [
                'name' => $assinante->nome ?? $assinante->responsavel ?? $assinante->empresa,
                'email' => $assinante->email,
            ],
            'back_urls' => [
                'success' => config('app.frontend_url') . '/planos/sucesso',
                'failure' => config('app.frontend_url') . '/planos/falha',
                'pending' => config('app.frontend_url') . '/planos/pendente',
            ],
            'auto_return' => 'approved',
            'external_reference' => (string) $assinatura->id,
            'notification_url' => config('app.url') . '/api/webhook/mercadopago',
            'statement_descriptor' => 'BOVINO',
            'payment_methods' => [
                'excluded_payment_types' => [],
                'installments' => 1,
            ],
        ];

        $response = Http::withToken($this->token)
            ->post("{$this->baseUrl}/checkout/preferences", $payload);

        if ($response->failed()) {
            Log::error('MercadoPago preference error', $response->json());
            throw new \RuntimeException('Erro ao criar preferência de pagamento.');
        }

        $data = $response->json();

        $assinatura->update(['gateway_id' => $data['id']]);

        return [
            'preference_id' => $data['id'],
            'init_point' => $data['init_point'],
            'sandbox_init_point' => $data['sandbox_init_point'],
        ];
    }

    /**
     * Processa pagamento enviado pelo Checkout Bricks (frontend).
     * Recebe o formData do Brick e cria o pagamento via API do MP.
     */
    public function criarPagamentoBrick(Assinatura $assinatura, array $formData): array
    {
        $assinante = $assinatura->assinante;

        $payload = [
            'transaction_amount' => (float) $assinatura->valor,
            'description'        => "Bovino — {$assinatura->plano->nome}",
            'payment_method_id'  => $formData['payment_method_id'],
            'external_reference' => (string) $assinatura->id,
            'notification_url'   => config('app.url') . '/api/webhook/mercadopago',
            'payer'              => array_merge(
                ['email' => $assinante->email ?? $formData['payer']['email'] ?? 'payer@email.com'],
                $formData['payer'] ?? []
            ),
        ];

        // Cartão: inclui token e parcelas
        if (!empty($formData['token'])) {
            $payload['token']        = $formData['token'];
            $payload['installments'] = $formData['installments'] ?? 1;
            if (!empty($formData['issuer_id'])) {
                $payload['issuer_id'] = $formData['issuer_id'];
            }
        }

        $response = Http::withToken($this->token)
            ->withHeaders(['X-Idempotency-Key' => 'assinatura-' . $assinatura->id . '-' . time()])
            ->post("{$this->baseUrl}/v1/payments", $payload);

        if ($response->failed()) {
            Log::error('MP criarPagamentoBrick error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Erro ao processar pagamento: ' . ($response->json('message') ?? $response->status()));
        }

        $data = $response->json();

        // Processa imediatamente (não espera webhook para resposta síncrona)
        $this->processarPagamento((string) $data['id']);

        return [
            'status'        => $data['status'],
            'status_detail' => $data['status_detail'],
            'payment_id'    => $data['id'],
            'payment_type'  => $data['payment_type_id'],
            // PIX: retorna QR code se pendente
            'pix_qr_code'   => $data['point_of_interaction']['transaction_data']['qr_code'] ?? null,
            'pix_qr_code_base64' => $data['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null,
        ];
    }

    /**
     * Processa notificação IPN/webhook do Mercado Pago.
     */
    public function processarWebhook(array $payload): void
    {
        $tipo = $payload['type'] ?? $payload['topic'] ?? null;
        $resourceId = $payload['data']['id'] ?? $payload['id'] ?? null;

        if (!$tipo || !$resourceId) return;

        if ($tipo === 'payment') {
            $this->processarPagamento((string) $resourceId);
        }
    }

    private function processarPagamento(string $gatewayPaymentId): void
    {
        $response = Http::withToken($this->token)
            ->get("{$this->baseUrl}/v1/payments/{$gatewayPaymentId}");

        if ($response->failed()) return;

        $data = $response->json();
        $assinaturaId = $data['external_reference'] ?? null;
        if (!$assinaturaId) return;

        $assinatura = Assinatura::find($assinaturaId);
        if (!$assinatura) return;

        $statusMap = [
            'approved' => 'aprovado',
            'rejected' => 'recusado',
            'refunded' => 'reembolsado',
            'pending'  => 'pendente',
        ];

        $status = $statusMap[$data['status']] ?? 'pendente';

        // Idempotência: se este gateway_id já foi processado com o mesmo status, ignorar.
        // Evita que reenvios do gateway sobrescrevam expira_em ou dupliquem efeitos.
        $pagamentoExistente = Pagamento::where('gateway_id', $gatewayPaymentId)->first();
        if ($pagamentoExistente && $pagamentoExistente->status === $status) {
            Log::info('Webhook MP ignorado (idempotência)', [
                'gateway_id' => $gatewayPaymentId,
                'status'     => $status,
            ]);
            return;
        }

        Pagamento::updateOrCreate(
            ['gateway_id' => $gatewayPaymentId],
            [
                'assinatura_id' => $assinatura->id,
                'valor'          => $data['transaction_amount'],
                'status'         => $status,
                'metodo'         => $data['payment_type_id'] ?? null,
                'gateway_response' => $data,
                'pago_em'        => $status === 'aprovado' ? now() : null,
            ]
        );

        if ($status === 'aprovado') {
            // Só estende a assinatura se ainda não estava ativa com data futura
            $novaExpiracao = now()->addMonth();
            $assinatura->update([
                'status'    => 'ativa',
                'inicia_em' => $assinatura->inicia_em ?? now(),
                'expira_em' => $assinatura->expira_em && $assinatura->expira_em->isFuture()
                    ? $assinatura->expira_em->addMonth()
                    : $novaExpiracao,
            ]);
        } elseif ($status === 'recusado') {
            $assinatura->update(['status' => 'cancelada']);
        }
    }
}
