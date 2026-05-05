<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoCampo;
use App\Models\Fazenda;
use App\Models\Pesagem;
use App\Models\Rebanho;
use App\Models\SessaoCurral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoCurralController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function iniciarSessao(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $sessao  = SessaoCurral::create([
            'fazenda_id'  => $fazenda->id,
            'user_id'     => $request->user()->id,
            'data_sessao' => today(),
            'descricao'   => $request->input('descricao', 'Sessão de curral'),
            'status'      => 'ativa',
        ]);
        return response()->json($sessao, 201);
    }

    public function indexSessoes(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            SessaoCurral::where('fazenda_id', $fazenda->id)
                ->with('user')
                ->orderByDesc('data_sessao')
                ->paginate(20)
        );
    }

    /**
     * Sincroniza dados coletados offline no curral.
     * Recebe um array de registros: pesagens, eventos, sanitários.
     */
    public function sincronizar(Request $request, int $sessaoId): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $sessao  = SessaoCurral::where('fazenda_id', $fazenda->id)->findOrFail($sessaoId);

        $dados = $request->validate([
            'pesagens'                   => ['nullable', 'array'],
            'pesagens.*.animal_id'       => ['required', 'integer'],
            'pesagens.*.peso_kg'         => ['required', 'numeric'],
            'pesagens.*.data'            => ['required', 'date'],
            'pesagens.*.coletado_em'     => ['nullable', 'date'],
            'eventos'                    => ['nullable', 'array'],
            'eventos.*.tipo'             => ['required', 'string'],
            'eventos.*.descricao'        => ['required', 'string'],
            'eventos.*.animal_id'        => ['nullable', 'integer'],
            'eventos.*.data_evento'      => ['required', 'date'],
            'eventos.*.coletado_em'      => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($dados, $fazenda, $request, $sessao) {
            $totalAnimais = 0;

            foreach ($dados['pesagens'] ?? [] as $p) {
                Pesagem::create([
                    'animal_id'   => $p['animal_id'],
                    'fazenda_id'  => $fazenda->id,
                    'peso'        => $p['peso_kg'],
                    'data_pesagem' => $p['data'],
                    'observacao'  => $p['observacoes'] ?? null,
                    // Preserva o timestamp de quando foi coletado offline
                    'coletado_em' => $p['coletado_em'] ?? $p['data'],
                ]);
                $totalAnimais++;

                Rebanho::where('id', $p['animal_id'])
                    ->update(['peso_atual' => $p['peso_kg']]);
            }

            foreach ($dados['eventos'] ?? [] as $ev) {
                EventoCampo::create([
                    'fazenda_id'    => $fazenda->id,
                    'tipo'          => $ev['tipo'],
                    'descricao'     => $ev['descricao'],
                    'animal_id'     => $ev['animal_id'] ?? null,
                    'data_evento'   => $ev['data_evento'],
                    'urgencia'      => $ev['urgencia'] ?? 'media',
                    'reportado_por' => $request->user()->id,
                    'coletado_em'   => $ev['coletado_em'] ?? $ev['data_evento'],
                ]);
            }

            $sessao->update([
                'status'           => 'sincronizada',
                'total_animais'    => $totalAnimais,
                'sincronizado_em'  => now(),
                'dados_offline'    => $dados,
            ]);
        });

        return response()->json(['message' => 'Dados sincronizados com sucesso.', 'sessao_id' => $sessaoId]);
    }

    /** Retorna dados do rebanho para uso offline */
    public function dadosOffline(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $animais = Rebanho::where('fazenda_id', $fazenda->id)
            ->where('status', 'ativo')
            ->select('id','brinco','nome','raca','categoria','sexo','peso_atual')
            ->get();

        $lotes = \App\Models\LoteGestao::where('fazenda_id', $fazenda->id)
            ->select('id','nome','raca','qtd_cabecas')
            ->get();

        return response()->json([
            'animais'       => $animais,
            'lotes'         => $lotes,
            'sincronizado_em' => now()->toIso8601String(),
        ]);
    }
}
