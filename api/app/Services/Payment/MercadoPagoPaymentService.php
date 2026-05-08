<?php

namespace App\Services\Payment;

use App\Contracts\PaymentServiceInterface;
use App\Models\Assinatura;
use App\Models\Pagamento;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoPaymentService implements PaymentServiceInterface
{
    private string $baseUrl = 'https://api.mercadopago.com';
    private string $token;

    public function __construct()
    {
        $this->token = config('services.mercadopago.access_token', '');
    }

    /**
     * Cria um pagamento PIX via Checkout Bricks.
     * Retorna o QR Code para exibição no frontend.
     */
    public function iniciarPagamento(Assinatura $assinatura, array $formData): array
    {
        $assinante = $assinatura->assinante;

        $payerForm = $formData['payer'] ?? [];
        if (empty($payerForm['identification']['number'])) {
            $payerForm['identification'] = [
                'type'   => 'CPF',
                'number' => $assinante->cpf ?? '12345678909',
            ];
        }

        $payerEmail = app()->environment('production')
            ? ($assinante->email ?? $payerForm['email'] ?? 'payer@email.com')
            : (config('services.mercadopago.test_buyer_email') ?? $assinante->email ?? $payerForm['email'] ?? 'payer@email.com');

        $payload = [
            'transaction_amount' => (float) $assinatura->valor,
            'description'        => "Bovino — {$assinatura->plano->nome}",
            'payment_method_id'  => $formData['payment_method_id'],
            'external_reference' => (string) $assinatura->id,
            'notification_url'   => config('app.url') . '/api/webhook/mercadopago',
            'payer'              => array_merge(['email' => $payerEmail], $payerForm),
        ];

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
            Log::error('MP iniciarPagamento error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Erro ao processar pagamento PIX: ' . ($response->json('message') ?? $response->status()));
        }

        $data = $response->json();

        $this->processarPagamento((string) $data['id']);

        return [
            'status'             => $data['status'],
            'status_detail'      => $data['status_detail'],
            'payment_id'         => $data['id'],
            'payment_type'       => $data['payment_type_id'],
            'pix_qr_code'        => $data['point_of_interaction']['transaction_data']['qr_code'] ?? null,
            'pix_qr_code_base64' => $data['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null,
        ];
    }

    /**
     * PIX não tem subscription nativa — apenas marcamos como cancelada.
     */
    public function cancelarAssinatura(Assinatura $assinatura): void
    {
        $assinatura->update(['status' => 'cancelada', 'cancelada_em' => now()]);
    }

    /**
     * Processa notificação IPN/webhook do Mercado Pago.
     */
    public function processarWebhook(array $payload): void
    {
        $tipo       = $payload['type'] ?? $payload['topic'] ?? null;
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

        $data         = $response->json();
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

        $pagamentoExistente = Pagamento::where('gateway_id', $gatewayPaymentId)->first();
        if ($pagamentoExistente && $pagamentoExistente->status === $status) return;

        Pagamento::updateOrCreate(
            ['gateway_id' => $gatewayPaymentId],
            [
                'assinatura_id'    => $assinatura->id,
                'gateway'          => 'mercadopago',
                'valor'            => $data['transaction_amount'],
                'status'           => $status,
                'metodo'           => $data['payment_type_id'] ?? null,
                'gateway_response' => $data,
                'pago_em'          => $status === 'aprovado' ? now() : null,
            ]
        );

        if ($status === 'aprovado') {
            $novaExpiracao = now()->addMonth();
            $assinatura->update([
                'status'    => 'ativa',
                'gateway'   => 'mercadopago',
                'inicia_em' => $assinatura->inicia_em ?? now(),
                'expira_em' => $assinatura->expira_em?->isFuture()
                    ? $assinatura->expira_em->addMonth()
                    : $novaExpiracao,
            ]);
        } elseif ($status === 'recusado') {
            $assinatura->update(['status' => 'cancelada']);
        }
    }
}
