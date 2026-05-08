<?php

namespace App\Services\Payment;

use App\Contracts\PaymentServiceInterface;
use App\Models\Assinatura;
use App\Models\Pagamento;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;

class StripePaymentService implements PaymentServiceInterface
{
    private StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    /**
     * Cria (ou recupera) o Customer da Stripe, cria a Subscription e retorna
     * o client_secret para o Payment Element confirmar o pagamento no frontend.
     */
    public function iniciarPagamento(Assinatura $assinatura, array $dados): array
    {
        $assinante = $assinatura->assinante;

        $stripeCustomerId = $assinante->stripe_customer_id
            ?? $this->criarOuRecuperarCustomer($assinante);

        try {
            $subscription = $this->stripe->subscriptions->create([
                'customer'         => $stripeCustomerId,
                'items'            => [['price' => $assinatura->plano->stripe_price_id]],
                'payment_behavior' => 'default_incomplete',
                'payment_settings' => ['save_default_payment_method' => 'on_subscription'],
                'expand'           => ['latest_invoice.payment_intent', 'pending_setup_intent'],
                'metadata'         => ['assinatura_id' => (string) $assinatura->id],
            ]);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe iniciarPagamento error', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Erro ao criar assinatura na Stripe: ' . $e->getMessage());
        }

        Log::info('Stripe subscription criada', [
            'subscription_id'       => $subscription->id,
            'status'                => $subscription->status,
            'has_payment_intent'    => $subscription->latest_invoice?->payment_intent !== null,
            'has_setup_intent'      => $subscription->pending_setup_intent !== null,
            'latest_invoice_status' => $subscription->latest_invoice?->status ?? null,
        ]);

        $assinatura->update([
            'gateway'                => 'stripe',
            'stripe_subscription_id' => $subscription->id,
        ]);

        // 1. Tenta PaymentIntent do expand
        $clientSecret = $subscription->latest_invoice?->payment_intent?->client_secret ?? null;

        // 2. Busca invoice separadamente se PaymentIntent vier null
        if (!$clientSecret) {
            $invoiceId = is_string($subscription->latest_invoice)
                ? $subscription->latest_invoice
                : $subscription->latest_invoice?->id;

            if ($invoiceId) {
                try {
                    $invoice      = $this->stripe->invoices->retrieve($invoiceId, ['expand' => ['payment_intent']]);
                    $clientSecret = $invoice->payment_intent?->client_secret ?? null;
                } catch (\Stripe\Exception\ApiErrorException $e) {
                    Log::warning('Stripe: falha ao buscar invoice', ['error' => $e->getMessage()]);
                }
            }
        }

        // 3. Fallback: SetupIntent para cliente sem método de pagamento
        if (!$clientSecret && $subscription->pending_setup_intent) {
            $setupIntent  = $subscription->pending_setup_intent;
            $clientSecret = is_string($setupIntent) ? null : $setupIntent->client_secret ?? null;
        }

        if (!$clientSecret) {
            Log::error('Stripe: client_secret null após todas tentativas', [
                'subscription_id' => $subscription->id,
                'status'          => $subscription->status,
            ]);
            throw new \RuntimeException('Não foi possível iniciar o pagamento. Tente novamente.');
        }

        return [
            'client_secret'   => $clientSecret,
            'subscription_id' => $subscription->id,
        ];
    }

    /**
     * Cancela a Subscription na Stripe imediatamente e atualiza o registro local.
     */
    public function cancelarAssinatura(Assinatura $assinatura): void
    {
        if ($assinatura->stripe_subscription_id) {
            try {
                $this->stripe->subscriptions->cancel($assinatura->stripe_subscription_id);
            } catch (\Stripe\Exception\ApiErrorException $e) {
                Log::error('Stripe cancelarAssinatura error', ['error' => $e->getMessage()]);
            }
        }

        $assinatura->update(['status' => 'cancelada', 'cancelada_em' => now()]);
    }

    /**
     * Processa eventos do webhook da Stripe.
     */
    public function processarWebhook(array $payload): void
    {
        match ($payload['type'] ?? '') {
            'invoice.payment_succeeded'      => $this->handleInvoicePaid($payload['data']['object']),
            'invoice.payment_failed'         => $this->handleInvoiceFailed($payload['data']['object']),
            'customer.subscription.deleted'  => $this->handleSubscriptionDeleted($payload['data']['object']),
            default                          => null,
        };
    }

    private function handleInvoicePaid(array $invoice): void
    {
        $assinatura = Assinatura::where('stripe_subscription_id', $invoice['subscription'])->first();
        if (!$assinatura) return;

        Pagamento::updateOrCreate(
            ['gateway' => 'stripe', 'gateway_id' => $invoice['payment_intent']],
            [
                'assinatura_id'    => $assinatura->id,
                'gateway'          => 'stripe',
                'valor'            => $invoice['amount_paid'] / 100,
                'status'           => 'aprovado',
                'metodo'           => 'credit_card',
                'gateway_response' => $invoice,
                'pago_em'          => now(),
            ]
        );

        $novaExpiracao = now()->addMonth();
        $assinatura->update([
            'status'    => 'ativa',
            'inicia_em' => $assinatura->inicia_em ?? now(),
            'expira_em' => $assinatura->expira_em?->isFuture()
                ? $assinatura->expira_em->addMonth()
                : $novaExpiracao,
        ]);
    }

    private function handleInvoiceFailed(array $invoice): void
    {
        $assinatura = Assinatura::where('stripe_subscription_id', $invoice['subscription'])->first();
        if (!$assinatura) return;

        Pagamento::create([
            'assinatura_id'    => $assinatura->id,
            'gateway'          => 'stripe',
            'gateway_id'       => $invoice['payment_intent'] ?? null,
            'valor'            => $invoice['amount_due'] / 100,
            'status'           => 'recusado',
            'metodo'           => 'credit_card',
            'gateway_response' => $invoice,
        ]);

        Log::warning('Stripe invoice.payment_failed', [
            'assinatura_id'   => $assinatura->id,
            'subscription_id' => $invoice['subscription'],
        ]);
    }

    private function handleSubscriptionDeleted(array $subscription): void
    {
        $assinatura = Assinatura::where('stripe_subscription_id', $subscription['id'])->first();
        if (!$assinatura) return;

        $assinatura->update(['status' => 'cancelada', 'cancelada_em' => now()]);
    }

    private function criarOuRecuperarCustomer(object $assinante): string
    {
        try {
            $customer = $this->stripe->customers->create([
                'email'    => $assinante->email,
                'name'     => $assinante->nome ?? $assinante->responsavel ?? $assinante->empresa ?? '',
                'metadata' => [
                    'user_id'   => (string) $assinante->id,
                    'user_type' => class_basename($assinante),
                ],
            ]);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe criarCustomer error', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Erro ao criar cliente na Stripe.');
        }

        $assinante->update(['stripe_customer_id' => $customer->id]);

        return $customer->id;
    }
}
