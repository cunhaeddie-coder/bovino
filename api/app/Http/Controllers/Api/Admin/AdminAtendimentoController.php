<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAtendimentoController extends Controller
{
    // ── Catálogo ──────────────────────────────────────────────────────────────

    public function indexServicos(): JsonResponse
    {
        return response()->json(
            DB::table('atendimento_servicos')->orderBy('ordem')->get()
        );
    }

    public function storeServico(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome'               => 'required|string|max:120',
            'descricao'          => 'nullable|string|max:500',
            'valor'              => 'required|numeric|min:0',
            'percentual_tecnico' => 'required|numeric|min:0|max:100',
            'duracao_horas'      => 'required|numeric|min:0',
            'modalidade'         => 'required|in:online,presencial,hibrido',
            'ordem'              => 'nullable|integer',
        ]);

        $id = DB::table('atendimento_servicos')->insertGetId(array_merge($data, [
            'ativo' => true, 'created_at' => now(), 'updated_at' => now(),
        ]));

        return response()->json(DB::table('atendimento_servicos')->find($id), 201);
    }

    public function updateServico(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'nome'               => 'sometimes|string|max:120',
            'descricao'          => 'nullable|string|max:500',
            'valor'              => 'sometimes|numeric|min:0',
            'percentual_tecnico' => 'sometimes|numeric|min:0|max:100',
            'duracao_horas'      => 'sometimes|numeric|min:0',
            'modalidade'         => 'sometimes|in:online,presencial,hibrido',
            'ativo'              => 'sometimes|boolean',
            'ordem'              => 'nullable|integer',
        ]);
        DB::table('atendimento_servicos')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        return response()->json(DB::table('atendimento_servicos')->find($id));
    }

    // ── Ordens ────────────────────────────────────────────────────────────────

    public function indexOrdens(Request $request): JsonResponse
    {
        $admin = $request->user();
        $papel = $admin->papel ?? 'tecnico';

        $query = DB::table('ordens_atendimento as oa')
            ->join('atendimento_servicos as s', 's.id', '=', 'oa.servico_id')
            ->join('users as u', 'u.id', '=', 'oa.cliente_id')
            ->leftJoin('admins as a', 'a.id', '=', 'oa.tecnico_id')
            ->select(
                'oa.*',
                's.nome as servico_nome', 's.modalidade',
                'u.nome as cliente_nome', 'u.celular as cliente_celular',
                'a.nome as tecnico_nome'
            )
            ->orderByDesc('oa.created_at');

        // Técnico vê apenas as suas
        if (in_array($papel, ['ti', 'treinamento', 'tecnico'])) {
            $query->where('oa.tecnico_id', $admin->id);
        }

        if ($request->filled('status')) {
            $query->where('oa.status', $request->status);
        }
        if ($request->filled('tecnico_id')) {
            $query->where('oa.tecnico_id', $request->tecnico_id);
        }

        return response()->json($query->paginate(20));
    }

    public function storeOrdem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cliente_id'  => 'required|exists:users,id',
            'servico_id'  => 'required|exists:atendimento_servicos,id',
            'tecnico_id'  => 'nullable|exists:admins,id',
            'data_hora'   => 'nullable|date',
            'link_reuniao'=> 'nullable|url|max:300',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        $servico = DB::table('atendimento_servicos')->find($data['servico_id']);
        $data['valor_cliente'] = $servico->valor;
        $data['valor_tecnico'] = round($servico->valor * ($servico->percentual_tecnico / 100), 2);
        $data['status']        = 'pendente';
        $data['created_at']    = now();
        $data['updated_at']    = now();

        $id = DB::table('ordens_atendimento')->insertGetId($data);

        return response()->json($this->findOrdem($id), 201);
    }

    public function updateOrdem(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'tecnico_id'   => 'nullable|exists:admins,id',
            'data_hora'    => 'nullable|date',
            'link_reuniao' => 'nullable|url|max:300',
            'observacoes'  => 'nullable|string|max:1000',
            'status'       => 'sometimes|in:pendente,aceita,agendada,em_andamento,concluida,recusada,cancelada',
        ]);
        DB::table('ordens_atendimento')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        return response()->json($this->findOrdem($id));
    }

    public function aceitar(int $id): JsonResponse
    {
        DB::table('ordens_atendimento')->where('id', $id)->update(['status' => 'aceita', 'updated_at' => now()]);
        return response()->json($this->findOrdem($id));
    }

    public function recusar(int $id): JsonResponse
    {
        DB::table('ordens_atendimento')->where('id', $id)->update(['status' => 'recusada', 'updated_at' => now()]);
        return response()->json($this->findOrdem($id));
    }

    public function iniciar(int $id): JsonResponse
    {
        DB::table('ordens_atendimento')->where('id', $id)->update(['status' => 'em_andamento', 'updated_at' => now()]);
        return response()->json($this->findOrdem($id));
    }

    public function concluir(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'descricao'       => 'required|string|max:2000',
            'duracao_real'    => 'nullable|numeric|min:0',
            'avaliacao_cliente' => 'nullable|integer|min:1|max:5',
            'proximos_passos' => 'nullable|string|max:1000',
        ]);

        DB::table('atendimento_registros')->insert(array_merge($data, [
            'ordem_id'   => $id,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        DB::table('ordens_atendimento')->where('id', $id)->update(['status' => 'concluida', 'updated_at' => now()]);

        return response()->json($this->findOrdem($id));
    }

    public function confirmarPagamentoCliente(int $id): JsonResponse
    {
        DB::table('ordens_atendimento')->where('id', $id)->update(['pago_cliente' => true, 'updated_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function confirmarPagamentoTecnico(int $id): JsonResponse
    {
        DB::table('ordens_atendimento')->where('id', $id)->update(['pago_tecnico' => true, 'updated_at' => now()]);
        return response()->json(['ok' => true]);
    }

    // ── Agenda ────────────────────────────────────────────────────────────────

    public function agenda(Request $request): JsonResponse
    {
        $admin = $request->user();
        $papel = $admin->papel ?? 'tecnico';
        $mes   = $request->get('mes', now()->format('Y-m'));

        $query = DB::table('ordens_atendimento as oa')
            ->join('atendimento_servicos as s', 's.id', '=', 'oa.servico_id')
            ->join('users as u', 'u.id', '=', 'oa.cliente_id')
            ->leftJoin('admins as a', 'a.id', '=', 'oa.tecnico_id')
            ->select('oa.id', 'oa.status', 'oa.data_hora', 'oa.link_reuniao',
                     's.nome as servico_nome', 's.modalidade',
                     'u.nome as cliente_nome', 'u.celular as cliente_celular',
                     'a.nome as tecnico_nome')
            ->whereNotNull('oa.data_hora')
            ->whereRaw("DATE_FORMAT(oa.data_hora, '%Y-%m') = ?", [$mes])
            ->orderBy('oa.data_hora');

        if (in_array($papel, ['ti', 'treinamento', 'tecnico'])) {
            $query->where('oa.tecnico_id', $admin->id);
        } elseif ($request->filled('tecnico_id')) {
            $query->where('oa.tecnico_id', $request->tecnico_id);
        }

        return response()->json($query->get());
    }

    // ── Financeiro dos técnicos ───────────────────────────────────────────────

    public function saldoTecnicos(): JsonResponse
    {
        $saldos = DB::table('ordens_atendimento as oa')
            ->join('admins as a', 'a.id', '=', 'oa.tecnico_id')
            ->where('oa.status', 'concluida')
            ->select(
                'a.id', 'a.nome',
                DB::raw('SUM(oa.valor_tecnico) as total_gerado'),
                DB::raw('SUM(CASE WHEN oa.pago_tecnico = 1 THEN oa.valor_tecnico ELSE 0 END) as total_pago'),
                DB::raw('SUM(CASE WHEN oa.pago_tecnico = 0 THEN oa.valor_tecnico ELSE 0 END) as saldo_devedor'),
                DB::raw('COUNT(*) as ordens_concluidas')
            )
            ->groupBy('a.id', 'a.nome')
            ->get();

        return response()->json($saldos);
    }

    public function tecnicos(): JsonResponse
    {
        $tecnicos = DB::table('admins')
            ->whereIn('papel', ['ti', 'treinamento', 'tecnico'])
            ->where('ativo', true)
            ->select('id', 'nome', 'papel')
            ->orderBy('nome')
            ->get();

        return response()->json($tecnicos);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function findOrdem(int $id): object
    {
        return DB::table('ordens_atendimento as oa')
            ->join('atendimento_servicos as s', 's.id', '=', 'oa.servico_id')
            ->join('users as u', 'u.id', '=', 'oa.cliente_id')
            ->leftJoin('admins as a', 'a.id', '=', 'oa.tecnico_id')
            ->select('oa.*', 's.nome as servico_nome', 's.modalidade',
                     'u.nome as cliente_nome', 'u.celular as cliente_celular',
                     'a.nome as tecnico_nome')
            ->where('oa.id', $id)
            ->first();
    }
}
