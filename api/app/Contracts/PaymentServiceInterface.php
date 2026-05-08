<?php

namespace App\Contracts;

use App\Models\Assinatura;

interface PaymentServiceInterface
{
    /**
     * Inicia o pagamento para uma assinatura.
     * MP PIX: retorna qr_code e qr_code_base64.
     * Stripe: retorna client_secret para o Payment Element confirmar.
     */
    public function iniciarPagamento(Assinatura $assinatura, array $dados): array;

    /**
     * Cancela a assinatura no gateway e atualiza o registro local.
     */
    public function cancelarAssinatura(Assinatura $assinatura): void;

    /**
     * Processa o payload do webhook do gateway.
     */
    public function processarWebhook(array $payload): void;
}
