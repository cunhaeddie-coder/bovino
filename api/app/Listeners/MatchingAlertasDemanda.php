<?php

namespace App\Listeners;

use App\Events\NovoAnuncio;
use App\Models\AlertaDemanda;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MatchingAlertasDemanda
{
    public function handle(NovoAnuncio $event): void
    {
        $anuncio = $event->anuncio->load('animal');
        $animal  = $anuncio->animal;

        if (!$animal) return;

        // Busca alertas ativos compatíveis com o anúncio recém-publicado
        $alertas = AlertaDemanda::where('ativo', true)
            ->where('user_id', '!=', $anuncio->user_id) // não notifica o próprio vendedor
            ->where(function ($q) use ($animal) {
                $q->whereNull('raca')->orWhere('raca', $animal->raca);
            })
            ->where(function ($q) use ($animal) {
                $q->whereNull('sexo')->orWhere('sexo', $animal->sexo)->orWhere('sexo', 'misto');
            })
            ->where(function ($q) use ($animal) {
                $q->whereNull('peso_min')->orWhere('peso_min', '<=', $animal->peso_estimado ?? 0);
            })
            ->where(function ($q) use ($animal) {
                $q->whereNull('peso_max')->orWhere('peso_max', '>=', $animal->peso_estimado ?? 9999);
            })
            ->get()
            ->filter(function (AlertaDemanda $alerta) use ($animal) {
                // estados é JSON array — verifica se o estado do animal está na lista (ou lista vazia = todos)
                return empty($alerta->estados) || in_array($animal->estado, $alerta->estados);
            });

        if ($alertas->isEmpty()) return;

        $notificacoes = $alertas->map(fn(AlertaDemanda $alerta) => [
            'user_id'    => $alerta->user_id,
            'tipo'       => 'match_demanda',
            'titulo'     => "Novo anúncio compatível com seu alerta",
            'mensagem'   => "{$animal->raca} — {$animal->quantidade} cab. em {$animal->municipio}/{$animal->estado} por R$ " . number_format($anuncio->preco_unitario, 2, ',', '.') . " /cab.",
            'dados'      => json_encode(['anuncio_id' => $anuncio->id]),
            'created_at' => now(),
            'updated_at' => now(),
        ])->values()->all();

        // Insere notificações em lote
        if (!empty($notificacoes)) {
            DB::table('notificacoes')->insert($notificacoes);
        }

        // Atualiza ultimo_alerta_at dos alertas ativados
        AlertaDemanda::whereIn('id', $alertas->pluck('id'))
            ->update(['ultimo_alerta_at' => now()]);

        Log::info('Matchmaking: ' . count($notificacoes) . ' alertas disparados para anúncio #' . $anuncio->id);
    }
}
