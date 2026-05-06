<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoReproducao;
use App\Models\EventoSaude;
use App\Models\Funcionario;
use App\Models\OrdemServico;
use App\Models\OrdemServicoAnimal;
use App\Models\Pesagem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdemServicoController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $query = OrdemServico::where('fazenda_id', $fazenda->id)
            ->with(['vaqueiro:id,nome,papel', 'pastagemDestino:id,nome'])
            ->withCount(['animais', 'animais as feitos_count' => fn($q) => $q->where('status', 'feito')])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->finalidade, fn($q) => $q->where('finalidade', $request->finalidade))
            ->orderByDesc('created_at');

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'nome'                => ['required', 'string', 'max:100'],
            'finalidade'          => ['required', 'in:desmama,vacinacao,pesagem,transferencia_pasto,engorda,iatf,cobertura,diagnostico_prenhez,descarte,venda_marketplace,venda_direta,frigorifico,marcacao_brinco,outro'],
            'atribuido_a'         => ['nullable', 'exists:funcionarios,id'],
            'pastagem_destino_id' => ['nullable', 'exists:pastagens,id'],
            'instrucoes'          => ['nullable', 'string', 'max:1000'],
            'animal_ids'          => ['required', 'array', 'min:1'],
            'animal_ids.*'        => ['exists:rebanho,id'],
        ]);

        // Garante que nenhum animal já está em outra OS ativa
        $emUso = OrdemServicoAnimal::whereIn('animal_id', $data['animal_ids'])
            ->whereHas('ordemServico', fn($q) => $q
                ->where('fazenda_id', $fazenda->id)
                ->whereNotIn('status', ['concluido', 'cancelado'])
            )->pluck('animal_id');

        if ($emUso->isNotEmpty()) {
            return response()->json([
                'message' => 'Um ou mais animais já estão em outra OS ativa.',
                'animal_ids' => $emUso,
            ], 422);
        }

        $os = OrdemServico::create([
            'fazenda_id'          => $fazenda->id,
            'nome'                => $data['nome'],
            'finalidade'          => $data['finalidade'],
            'status'              => 'rascunho',
            'criado_por'          => $request->user()->id,
            'atribuido_a'         => $data['atribuido_a'] ?? null,
            'pastagem_destino_id' => $data['pastagem_destino_id'] ?? null,
            'instrucoes'          => $data['instrucoes'] ?? null,
        ]);

        foreach ($data['animal_ids'] as $animalId) {
            OrdemServicoAnimal::create([
                'ordem_servico_id' => $os->id,
                'animal_id'        => $animalId,
                'status'           => 'pendente',
            ]);
        }

        return response()->json($os->load(['vaqueiro:id,nome', 'animais.animal']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)
            ->with([
                'vaqueiro:id,nome,papel,telefone',
                'pastagemDestino:id,nome',
                'animais.animal:id,brinco,nome,raca,sexo,categoria,data_nascimento,peso_atual',
                'animais.pastagemDestino:id,nome',
                'animais.executor:id,nome',
                'criador:id,nome',
            ])
            ->findOrFail($id);

        return response()->json($os);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)->findOrFail($id);

        abort_if(in_array($os->status, ['concluido', 'cancelado']), 422, 'OS encerrada não pode ser editada.');

        $data = $request->validate([
            'nome'                => ['sometimes', 'string', 'max:100'],
            'instrucoes'          => ['nullable', 'string', 'max:1000'],
            'atribuido_a'         => ['nullable', 'exists:funcionarios,id'],
            'pastagem_destino_id' => ['nullable', 'exists:pastagens,id'],
        ]);

        $os->update($data);
        return response()->json($os->fresh());
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)->findOrFail($id);

        abort_if($os->status === 'concluido', 422, 'OS concluída não pode ser removida.');

        $os->update(['status' => 'cancelado']);
        return response()->json(['message' => 'OS cancelada.']);
    }

    // ── AÇÕES ─────────────────────────────────────────────────────────────────

    public function publicar(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)->findOrFail($id);

        abort_if($os->status !== 'rascunho', 422, 'Somente rascunhos podem ser publicados.');
        abort_if($os->animais()->count() === 0, 422, 'Adicione ao menos um animal antes de publicar.');

        $os->update(['status' => 'aguardando', 'publicado_em' => now()]);

        // Notificação para o vaqueiro (se tiver user_id vinculado)
        if ($os->atribuido_a) {
            $vaqueiro = $os->vaqueiro;
            if ($vaqueiro && $vaqueiro->user_id) {
                \App\Models\Notificacao::create([
                    'user_id'         => $vaqueiro->user_id,
                    'tipo'            => 'ordem_servico',
                    'titulo'          => "Nova OS: {$os->nome}",
                    'corpo'           => "Você tem uma nova ordem de serviço aguardando execução.",
                    'link'            => "/app-vaqueiro/ordens/{$os->id}",
                    'referencia_tipo' => OrdemServico::class,
                    'referencia_id'   => $os->id,
                ]);
            }
        }

        return response()->json($os->fresh());
    }

    public function atualizarAnimal(Request $request, int $osId, int $animalId): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)->findOrFail($osId);

        abort_if(in_array($os->status, ['concluido', 'cancelado']), 422, 'OS encerrada.');

        $item = OrdemServicoAnimal::where('ordem_servico_id', $osId)
            ->where('animal_id', $animalId)
            ->firstOrFail();

        $data = $request->validate([
            'status'              => ['required', 'in:pendente,feito,nao_realizado'],
            'pastagem_destino_id' => ['nullable', 'exists:pastagens,id'],
            'peso_execucao'       => ['nullable', 'numeric', 'min:0'],
            'observacao'          => ['nullable', 'string', 'max:500'],
        ]);

        $item->update([
            ...$data,
            'executado_por' => $data['status'] === 'feito' ? $request->user()->id : null,
            'executado_em'  => $data['status'] === 'feito' ? now() : null,
        ]);

        // Atualiza status geral da OS
        $this->recalcularStatus($os);

        return response()->json($item->fresh());
    }

    public function executar(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $os = OrdemServico::where('fazenda_id', $fazenda->id)
            ->with('animais.animal')
            ->findOrFail($id);

        abort_if(in_array($os->status, ['rascunho', 'concluido', 'cancelado']), 422, 'OS não está pronta para execução.');

        $user = $request->user();
        $hoje = now()->toDateString();

        $data = $request->validate([
            'vacina_nome'  => ['sometimes', 'string', 'max:100'],
            'vacina_lote'  => ['sometimes', 'string', 'max:60'],
            'observacao'   => ['nullable', 'string', 'max:500'],
        ]);

        foreach ($os->animais as $item) {
            if ($item->status !== 'feito') continue;
            $animal = $item->animal;
            if (!$animal) continue;

            match ($os->finalidade) {
                'desmama' => $this->executarDesmama($animal, $item, $os, $fazenda, $user),
                'pesagem' => $this->executarPesagem($animal, $item, $fazenda, $user, $hoje),
                'vacinacao' => $this->executarVacinacao($animal, $fazenda, $user, $hoje, $data),
                'transferencia_pasto', 'engorda' => $this->executarTransferencia($animal, $item, $os),
                'diagnostico_prenhez' => $this->executarDiagnostico($animal, $item, $fazenda, $user, $hoje),
                'iatf', 'cobertura' => $this->executarReproducao($animal, $os, $fazenda, $user, $hoje),
                'descarte' => $animal->update(['status' => 'morto']),
                'frigorifico', 'venda_marketplace', 'venda_direta' => $animal->update(['status' => 'vendido']),
                default => null,
            };
        }

        $os->update(['status' => 'concluido', 'executado_em' => now()]);

        return response()->json(['message' => 'OS executada com sucesso.', 'os' => $os->fresh()]);
    }

    // ── Integrações por finalidade ─────────────────────────────────────────

    private function executarDesmama($animal, $item, $os, $fazenda, $user): void
    {
        EventoReproducao::create([
            'fazenda_id'  => $fazenda->id,
            'animal_id'   => $animal->id,
            'tipo'        => 'desmame',
            'data_evento' => now()->toDateString(),
            'observacao'  => $os->instrucoes,
        ]);

        // Promove categoria
        $novaCategoria = $animal->sexo === 'macho' ? 'novilho' : 'novilha';
        $animal->update(['categoria' => $novaCategoria]);

        // Move para pastagem destino se informada
        $pastagId = $item->pastagem_destino_id ?? $os->pastagem_destino_id;
        if ($pastagId) $animal->update(['pastagem_id' => $pastagId]);
    }

    private function executarPesagem($animal, $item, $fazenda, $user, string $hoje): void
    {
        if (!$item->peso_execucao) return;

        Pesagem::create([
            'fazenda_id' => $fazenda->id,
            'animal_id'  => $animal->id,
            'peso'       => $item->peso_execucao,
            'data'       => $hoje,
            'registrado_por' => $user->id,
        ]);

        $animal->update(['peso_atual' => $item->peso_execucao]);
    }

    private function executarVacinacao($animal, $fazenda, $user, string $hoje, array $data): void
    {
        EventoSaude::create([
            'fazenda_id'  => $fazenda->id,
            'animal_id'   => $animal->id,
            'tipo'        => 'vacinacao',
            'data_evento' => $hoje,
            'descricao'   => $data['vacina_nome'] ?? 'Vacinação em lote',
            'lote_vacina' => $data['vacina_lote'] ?? null,
            'registrado_por' => $user->id,
        ]);
    }

    private function executarTransferencia($animal, $item, $os): void
    {
        $pastagId = $item->pastagem_destino_id ?? $os->pastagem_destino_id;
        if ($pastagId) $animal->update(['pastagem_id' => $pastagId]);
    }

    private function executarDiagnostico($animal, $item, $fazenda, $user, string $hoje): void
    {
        EventoReproducao::create([
            'fazenda_id'  => $fazenda->id,
            'animal_id'   => $animal->id,
            'tipo'        => 'diagnostico_prenhez',
            'data_evento' => $hoje,
            'resultado'   => $item->observacao === 'prenha',
            'observacao'  => $item->observacao,
        ]);
    }

    private function executarReproducao($animal, $os, $fazenda, $user, string $hoje): void
    {
        EventoReproducao::create([
            'fazenda_id'  => $fazenda->id,
            'animal_id'   => $animal->id,
            'tipo'        => $os->finalidade,
            'data_evento' => $hoje,
            'observacao'  => $os->instrucoes,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function recalcularStatus(OrdemServico $os): void
    {
        $total    = $os->animais()->count();
        $feitos   = $os->animais()->where('status', 'feito')->count();
        $naoFeito = $os->animais()->where('status', 'nao_realizado')->count();

        if ($feitos === 0 && $naoFeito === 0) return;

        $novoStatus = match(true) {
            ($feitos + $naoFeito) === $total => $feitos > 0 ? 'parcial' : 'em_andamento',
            $feitos > 0                     => 'em_andamento',
            default                         => $os->status,
        };

        if ($os->status === 'aguardando') $novoStatus = 'em_andamento';

        $os->update(['status' => $novoStatus]);
    }

    // ── VAQUEIRO: OS atribuídas ao usuário logado ─────────────────────────────

    public function minhasOrdens(Request $request): JsonResponse
    {
        $user = $request->user();
        $funcionario = Funcionario::where('user_id', $user->id)->first();

        if (!$funcionario) {
            return response()->json([]);
        }

        $ordens = OrdemServico::where('atribuido_a', $funcionario->id)
            ->whereIn('status', ['aguardando', 'em_andamento', 'parcial'])
            ->with([
                'pastagemDestino:id,nome',
                'animais.animal:id,brinco,nome,raca,sexo,categoria,peso_atual,data_nascimento',
                'animais.pastagemDestino:id,nome',
            ])
            ->withCount(['animais', 'animais as feitos_count' => fn($q) => $q->where('status', 'feito')])
            ->orderByDesc('publicado_em')
            ->get();

        return response()->json($ordens);
    }

    public function vaqueirAtualizarAnimal(Request $request, int $osId, int $animalId): JsonResponse
    {
        $user = $request->user();
        $funcionario = Funcionario::where('user_id', $user->id)->first();
        abort_if(!$funcionario, 403, 'Acesso negado.');

        $os = OrdemServico::where('atribuido_a', $funcionario->id)->findOrFail($osId);
        abort_if(in_array($os->status, ['concluido', 'cancelado']), 422, 'OS encerrada.');

        $item = OrdemServicoAnimal::where('ordem_servico_id', $osId)
            ->where('animal_id', $animalId)
            ->firstOrFail();

        $data = $request->validate([
            'status'              => ['required', 'in:pendente,feito,nao_realizado'],
            'pastagem_destino_id' => ['nullable', 'exists:pastagens,id'],
            'peso_execucao'       => ['nullable', 'numeric', 'min:0'],
            'observacao'          => ['nullable', 'string', 'max:500'],
        ]);

        $item->update([
            ...$data,
            'executado_por' => $data['status'] === 'feito' ? $user->id : null,
            'executado_em'  => $data['status'] === 'feito' ? now() : null,
        ]);

        $this->recalcularStatus($os);

        return response()->json($item->fresh());
    }

    public function estatisticas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $base = OrdemServico::where('fazenda_id', $fazenda->id);

        return response()->json([
            'total'       => (clone $base)->count(),
            'rascunho'    => (clone $base)->where('status', 'rascunho')->count(),
            'aguardando'  => (clone $base)->where('status', 'aguardando')->count(),
            'em_andamento'=> (clone $base)->where('status', 'em_andamento')->count(),
            'parcial'     => (clone $base)->where('status', 'parcial')->count(),
            'concluido'   => (clone $base)->where('status', 'concluido')->count(),
        ]);
    }
}
