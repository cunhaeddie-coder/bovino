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
     * Cria um PaymentIntent para a primeira cobrança.
     * A Subscription é criada no webhook payment_intent.succeeded,
     * evitando o problema da API Stripe 2025 que não cria PaymentIntent
     * automaticamente em subscriptions sem método de pagamento.
     */
    public function iniciarPagamento(Assinatura $assinatura, array $dados): array
    {
        $assinante = $assinatura->assinante;

        $stripeCustomerId = $assinante->stripe_customer_id
            ?? $this->criarOuRecuperarCustomer($assinante);

        try {
            $paymentIntent = $this->stripe->paymentIntents->create([
                'amount'                    => (int) round($assinatura->valor * 100),
                'currency'                  => 'brl',
                'customer'                  => $stripeCustomerId,
                'automatic_payment_methods' => ['enabled' => true],
                'setup_future_usage'        => 'off_session',
                'metadata'                  => [
                    'assinatura_id'   => (string) $assinatura->id,
                    'stripe_price_id' => $assinatura->plano->stripe_price_id,
                ],
            ]);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe iniciarPagamento error', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Erro ao iniciar pagamento: ' . $e->getMessage());
        }

        $assinatura->update(['gateway' => 'stripe']);

        return ['client_secret' => $paymentIntent->client_secret];
    }

    /**
     * Cancela a Subscription na Stripe e atualiza o registro local.
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
            'payment_intent.succeeded'      => $this->handlePaymentIntentSucceeded($payload['data']['object']),
            'invoice.payment_succeeded'     => $this->handleInvoicePaid($payload['data']['object']),
            'invoice.payment_failed'        => $this->handleInvoiceFailed($payload['data']['object']),
            'customer.subscription.deleted' => $this->handleSubscriptionDeleted($payload['data']['object']),
            default                         => null,
        };
    }

    /**
     * Primeira cobrança confirmada: cria Subscription com trial até próximo ciclo.
     */
    private function handlePaymentIntentSucceeded(array $pi): void
    {
        $assinaturaId  = $pi['metadata']['assinatura_id'] ?? null;
        $stripePriceId = $pi['metadata']['stripe_price_id'] ?? null;

        if (!$assinaturaId || !$stripePriceId) return;

        $assinatura = Assinatura::find($assinaturaId);
        if (!$assinatura || $assinatura->stripe_subscription_id) return;

        $assinante        = $assinatura->assinante;
        $stripeCustomerId = $assinante->stripe_customer_id;
        $paymentMethodId  = $pi['payment_method'] ?? null;

        if ($stripeCustomerId && $paymentMethodId) {
            try {
                // Define como método padrão do cliente
                $this->stripe->customers->update($stripeCustomerId, [
                    'invoice_settings' => ['default_payment_method' => $paymentMethodId],
                ]);

                // Cria Subscription com trial de 1 mês (sem cobrar novamente agora)
                $subscription = $this->stripe->subscriptions->create([
                    'customer'               => $stripeCustomerId,
                    'items'                  => [['price' => $stripePriceId]],
                    'default_payment_method' => $paymentMethodId,
                    'trial_end'              => now()->addMonth()->timestamp,
                    'metadata'               => ['assinatura_id' => $assinaturaId],
                ]);

                $assinatura->update(['stripe_subscription_id' => $subscription->id]);
            } catch (\Stripe\Exception\ApiErrorException $e) {
                Log::error('Stripe: falha ao criar subscription', ['error' => $e->getMessage()]);
            }
        }

        Pagamento::updateOrCreate(
            ['gateway' => 'stripe', 'gateway_id' => $pi['id']],
            [
                'assinatura_id'    => $assinatura->id,
                'gateway'          => 'stripe',
                'valor'            => $pi['amount'] / 100,
                'status'           => 'aprovado',
                'metodo'           => 'credit_card',
                'gateway_response' => $pi,
                'pago_em'          => now(),
            ]
        );

        $assinatura->update([
            'status'    => 'ativa',
            'inicia_em' => now(),
            'expira_em' => now()->addMonth(),
        ]);
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

        $assinatura->update([
            'status'    => 'ativa',
            'inicia_em' => $assinatura->inicia_em ?? now(),
            'expira_em' => $assinatura->expira_em?->isFuture()
                ? $assinatura->expira_em->addMonth()
                : now()->addMonth(),
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
