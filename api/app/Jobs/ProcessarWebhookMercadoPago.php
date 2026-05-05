<?php

namespace App\Jobs;

use App\Services\MercadoPagoService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessarWebhookMercadoPago implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    // Tenta 3x com backoff exponencial antes de falhar definitivamente
    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(private readonly array $payload) {}

    public function handle(MercadoPagoService $mp): void
    {
        Log::info('Job: processando webhook MP', ['tipo' => $this->payload['type'] ?? null]);
        $mp->processarWebhook($this->payload);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('Job webhook MP falhou definitivamente', [
            'payload' => $this->payload,
            'erro'    => $e->getMessage(),
        ]);
    }
}
