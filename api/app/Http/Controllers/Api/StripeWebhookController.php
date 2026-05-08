<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessarWebhookStripe;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $payload   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret    = config('services.stripe.webhook_secret');

        try {
            $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $secret);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::warning('Stripe webhook: assinatura inválida', ['error' => $e->getMessage()]);
            return response('Invalid signature', 400);
        } catch (\UnexpectedValueException $e) {
            Log::warning('Stripe webhook: payload inválido', ['error' => $e->getMessage()]);
            return response('Invalid payload', 400);
        }

        Log::info('Stripe webhook recebido', ['type' => $event->type, 'id' => $event->id]);

        ProcessarWebhookStripe::dispatch($event->toArray());

        return response('OK', 200);
    }
}
