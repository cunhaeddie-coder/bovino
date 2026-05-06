<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fazenda;
use App\Models\Funcionario;
use App\Models\PrestadorServico;
use App\Models\Tarefa;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoFuncionarioController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    // ── FUNCIONÁRIOS ─────────────────────────────────────────────────────────

    public function indexFuncionarios(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            Funcionario::where('fazenda_id', $fazenda->id)
                ->when($request->boolean('ativo', true), fn($q) => $q->where('ativo', true))
                ->orderBy('nome')->get()
        );
    }

    public function storeFuncionario(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'nome'           => ['required','string'],
            'cpf'            => ['nullable','string'],
            'telefone'       => ['nullable','string'],
            'cargo'          => ['required','string'],
            'papel'          => ['nullable','in:vaqueiro,veterinario,gerente,outro'],
            'salario'        => ['nullable','numeric'],
            'data_admissao'  => ['required','date'],
            'tipo_contrato'  => ['required','in:clt,pj,temporario,diarista'],
            'observacoes'    => ['nullable','string'],
        ]);
        $f = Funcionario::create(['fazenda_id' => $fazenda->id] + $data);
        return response()->json($f, 201);
    }

    public function ativarApp(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $funcionario = Funcionario::where('fazenda_id', $fazenda->id)->findOrFail($id);

        if ($funcionario->user_id) {
            return response()->json(['message' => 'Funcionário já tem acesso ao app.', 'ja_ativo' => true]);
        }

        abort_if(!$funcionario->telefone, 422, 'Cadastre o telefone do funcionário primeiro.');

        $celular = preg_replace('/\D/', '', $funcionario->telefone);

        $user = User::firstOrCreate(
            ['celular' => $celular],
            ['nome' => $funcionario->nome, 'verificado_celular' => false]
        );

        $funcionario->update(['user_id' => $user->id]);

        // Envia OTP de ativação via WhatsApp
        try {
            $otpService = app(OtpService::class);
            $codigo = $otpService->gerar($celular, 'cadastro');
            $otpService->enviarWhatsApp($celular, $codigo);
        } catch (\Exception $e) {
            // Não bloqueia se o WhatsApp falhar — gestor pode informar manualmente
        }

        return response()->json([
            'message' => 'Acesso ativado. Código de primeiro acesso enviado via WhatsApp.',
            'celular'  => $celular,
            'user_id'  => $user->id,
        ]);
    }

    public function revogarApp(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $funcionario = Funcionario::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $funcionario->update(['user_id' => null]);
        return response()->json(['message' => 'Acesso ao app revogado.']);
    }

    public function updateFuncionario(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $f = Funcionario::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $f->update($request->except(['fazenda_id']));
        return response()->json($f);
    }

    public function desligarFuncionario(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $f = Funcionario::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $f->update(['ativo' => false, 'data_demissao' => $request->input('data_demissao', today())]);
        return response()->json(['message' => 'Funcionário desligado.']);
    }

    // ── PRESTADORES ─────────────────────────────────────────────────────────

    public function indexPrestadores(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            PrestadorServico::where('fazenda_id', $fazenda->id)->orderBy('nome')->get()
        );
    }

    public function storePrestador(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'nome'         => ['required','string'],
            'cnpj_cpf'     => ['nullable','string'],
            'telefone'     => ['nullable','string'],
            'especialidade'=> ['required','string'],
            'valor_hora'   => ['nullable','numeric'],
            'valor_diaria' => ['nullable','numeric'],
            'observacoes'  => ['nullable','string'],
        ]);
        $p = PrestadorServico::create(['fazenda_id' => $fazenda->id] + $data);
        return response()->json($p, 201);
    }

    public function updatePrestador(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $p = PrestadorServico::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $p->update($request->except(['fazenda_id']));
        return response()->json($p);
    }

    // ── TAREFAS ─────────────────────────────────────────────────────────────

    public function indexTarefas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $tarefas = Tarefa::where('fazenda_id', $fazenda->id)
            ->with(['responsavel','lote','pastagem'])
            ->when($request->status,    fn($q) => $q->where('status', $request->status))
            ->when($request->prioridade, fn($q) => $q->where('prioridade', $request->prioridade))
            ->orderByRaw("FIELD(prioridade,'urgente','alta','media','baixa')")
            ->orderBy('data_prevista')
            ->get();
        return response()->json($tarefas);
    }

    public function storeTarefa(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'titulo'           => ['required','string'],
            'descricao'        => ['nullable','string'],
            'tipo'             => ['required','string'],
            'prioridade'       => ['required','in:baixa,media,alta,urgente'],
            'data_prevista'    => ['nullable','date'],
            'responsavel_type' => ['nullable','in:funcionario,prestador'],
            'responsavel_id'   => ['nullable','integer'],
            'lote_id'          => ['nullable','integer'],
            'pastagem_id'      => ['nullable','integer'],
        ]);

        $responsavelType = match($data['responsavel_type'] ?? null) {
            'funcionario' => \App\Models\Funcionario::class,
            'prestador'   => \App\Models\PrestadorServico::class,
            default       => null,
        };

        $tarefa = Tarefa::create([
            'fazenda_id'       => $fazenda->id,
            'criado_por'       => $request->user()->id,
            'responsavel_type' => $responsavelType,
            'responsavel_id'   => $data['responsavel_id'] ?? null,
        ] + $data);

        return response()->json($tarefa->load(['responsavel','lote']), 201);
    }

    public function updateTarefa(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $tarefa = Tarefa::where('fazenda_id', $fazenda->id)->findOrFail($id);

        if ($request->status === 'concluida' && !$tarefa->data_conclusao) {
            $request->merge(['data_conclusao' => now()]);
        }

        $tarefa->update($request->except(['fazenda_id','criado_por']));
        return response()->json($tarefa->load(['responsavel']));
    }

    public function destroyTarefa(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        Tarefa::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Tarefa removida.']);
    }
}
