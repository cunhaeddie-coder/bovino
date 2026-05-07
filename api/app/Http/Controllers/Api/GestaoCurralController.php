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
        $user = $request->user();

        // Gestor: fazenda própria
        $fazenda = Fazenda::where('user_id', $user->id)->first();
        if ($fazenda) return $fazenda;

        // Vaqueiro: fazenda do funcionário vinculado
        $funcionario = \App\Models\Funcionario::where('user_id', $user->id)->first();
        if ($funcionario) {
            return Fazenda::findOrFail($funcionario->fazenda_id);
        }

        abort(403, 'Fazenda não encontrada.');
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
     * Sincronização direta — cria a sessão automaticamente e sincroniza tudo.
     * Não exige que o vaqueiro/gestor gerencie sessões manualmente.
     */
    public function sincronizarDireto(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $dados = $request->validate([
            'pesagens'              => ['nullable', 'array'],
            'pesagens.*.animal_id'  => ['required', 'integer'],
            'pesagens.*.peso_kg'    => ['required', 'numeric'],
            'pesagens.*.data'       => ['required', 'date'],
            'eventos'               => ['nullable', 'array'],
            'eventos.*.tipo'        => ['required', 'string'],
            'eventos.*.descricao'   => ['required', 'string'],
            'eventos.*.animal_id'   => ['nullable', 'integer'],
            'eventos.*.data_evento' => ['required', 'date'],
            'eventos.*.foto_base64' => ['nullable', 'string'],
        ]);

        $totalPesagens = 0;
        $totalEventos  = 0;

        try {
            DB::transaction(function () use ($dados, $fazenda, $request, &$totalPesagens, &$totalEventos) {

                foreach ($dados['pesagens'] ?? [] as $p) {
                    Pesagem::create([
                        'animal_id'    => $p['animal_id'],
                        'fazenda_id'   => $fazenda->id,
                        'peso'         => $p['peso_kg'],
                        'data_pesagem' => $p['data'],
                    ]);
                    Rebanho::where('id', $p['animal_id'])->update(['peso_atual' => $p['peso_kg']]);
                    $totalPesagens++;
                }

                foreach ($dados['eventos'] ?? [] as $ev) {
                    $fotoUrl = null;
                    if (!empty($ev['foto_base64'])) {
                        try {
                            $base64  = preg_replace('/^data:image\/\w+;base64,/', '', $ev['foto_base64']);
                            $imgData = base64_decode($base64);
                            if ($imgData) {
                                $nome    = 'eventos/' . uniqid('foto_') . '.jpg';
                                \Illuminate\Support\Facades\Storage::disk('public')->put($nome, $imgData);
                                $fotoUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($nome);
                            }
                        } catch (\Throwable $ignored) {}
                    }

                    EventoCampo::create([
                        'fazenda_id'    => $fazenda->id,
                        'tipo'          => $ev['tipo'],
                        'descricao'     => $ev['descricao'],
                        'animal_id'     => $ev['animal_id'] ?? null,
                        'data_evento'   => \Carbon\Carbon::parse($ev['data_evento']),
                        'urgencia'      => 'media',
                        'reportado_por' => $request->user()->id,
                        'foto_url'      => $fotoUrl,
                    ]);
                    $totalEventos++;
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro ao salvar: ' . $e->getMessage()], 500);
        }

        $total = $totalPesagens + $totalEventos;
        return response()->json(['message' => "✓ {$total} registro(s) sincronizado(s)."]);
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
            'eventos.*.foto_base64'      => ['nullable', 'string'],
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
                $fotoPath = null;

                // Salva foto base64 como arquivo se presente
                if (!empty($ev['foto_base64'])) {
                    try {
                        $base64  = preg_replace('/^data:image\/\w+;base64,/', '', $ev['foto_base64']);
                        $imgData = base64_decode($base64);
                        if ($imgData) {
                            $nome     = 'eventos/' . uniqid('foto_') . '.jpg';
                            \Illuminate\Support\Facades\Storage::disk('public')->put($nome, $imgData);
                            $fotoPath = \Illuminate\Support\Facades\Storage::disk('public')->url($nome);
                        }
                    } catch (\Throwable $e) {}
                }

                EventoCampo::create([
                    'fazenda_id'    => $fazenda->id,
                    'tipo'          => $ev['tipo'],
                    'descricao'     => $ev['descricao'],
                    'animal_id'     => $ev['animal_id'] ?? null,
                    'data_evento'   => $ev['data_evento'],
                    'urgencia'      => $ev['urgencia'] ?? 'media',
                    'reportado_por' => $request->user()->id,
                    'coletado_em'   => $ev['coletado_em'] ?? $ev['data_evento'],
                    'foto_url'      => $fotoPath,
                ]);
            }

            // Não armazena base64 no dados_offline (muito pesado)
            $dadosSemFoto = $dados;
            foreach ($dadosSemFoto['eventos'] ?? [] as &$ev) {
                unset($ev['foto_base64']);
            }

            $sessao->update([
                'status'           => 'sincronizada',
                'total_animais'    => $totalAnimais,
                'sincronizado_em'  => now(),
                'dados_offline'    => $dadosSemFoto,
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
