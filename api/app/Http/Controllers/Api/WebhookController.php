<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessarWebhookMercadoPago;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function mercadopago(Request $request): Response
    {
        Log::info('MercadoPago webhook recebido', $request->all());

        // Retorna 200 imediatamente — o Job processa em background.
        // Com QUEUE_CONNECTION=database o worker consome a fila assincronamente.
        // Em ambiente local/teste com QUEUE_CONNECTION=sync o Job roda na mesma requisição.
        ProcessarWebhookMercadoPago::dispatch($request->all());

        return response('', 200);
    }
}
