<?php

namespace App\Jobs;

use App\Services\Payment\StripePaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessarWebhookStripe implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 30;

    public function __construct(private readonly array $payload) {}

    public function handle(StripePaymentService $stripe): void
    {
        $stripe->processarWebhook($this->payload);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('ProcessarWebhookStripe falhou', [
            'event_type' => $this->payload['type'] ?? null,
            'event_id'   => $this->payload['id'] ?? null,
            'error'      => $e->getMessage(),
        ]);
    }
}
