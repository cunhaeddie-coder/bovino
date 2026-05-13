<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ContadorViewController extends Controller
{
    private const MAX_TENTATIVAS = 5;
    private const BLOQUEIO_MINUTOS = 60;
    private const SESSAO_HORAS = 24;

    private function buscarAcesso(string $token): object
    {
        $acesso = DB::table('contador_acessos')->where('token', $token)->first();

        abort_if(!$acesso || !$acesso->ativo, 404, 'Link inválido ou revogado.');
        abort_if(
            $acesso->expira_em && now()->toDateString() > $acesso->expira_em,
            410,
            'Este link expirou.'
        );

        return $acesso;
    }

    private function verificarSessao(object $acesso, Request $request): bool
    {
        $sessaoToken = $request->header('X-Contador-Sessao');
        if (!$sessaoToken || !$acesso->sessao_token) return false;
        if ($sessaoToken !== $acesso->sessao_token) return false;
        if ($acesso->sessao_expira_em && now()->gt($acesso->sessao_expira_em)) return false;
        return true;
    }

    // ── GET /contador/{token} — info pública do link ──────────────────────────

    public function show(string $token): JsonResponse
    {
        $acesso = $this->buscarAcesso($token);

        $fazenda = DB::table('fazendas')->find($acesso->fazenda_id);

        return response()->json([
            'nome_fazenda' => $fazenda?->nome ?? 'Propriedade',
            'tem_pin'      => !is_null($acesso->pin_hash),
            'expira_em'    => $acesso->expira_em,
        ]);
    }

    // ── POST /contador/{token}/verificar — valida PIN ─────────────────────────

    public function verificarPin(Request $request, string $token): JsonResponse
    {
        $acesso = $this->buscarAcesso($token);

        // Link sem PIN — cria sessão diretamente
        if (is_null($acesso->pin_hash)) {
            return response()->json(['sessao_token' => $this->criarSessao($acesso->id)]);
        }

        // Verifica bloqueio
        if ($acesso->bloqueado_ate && now()->lt($acesso->bloqueado_ate)) {
            $minutos = now()->diffInMinutes($acesso->bloqueado_ate) + 1;
            return response()->json([
                'message' => "Muitas tentativas incorretas. Tente novamente em {$minutos} minuto(s).",
            ], 429);
        }

        $data = $request->validate(['pin' => ['required', 'string']]);

        if (!Hash::check($data['pin'], $acesso->pin_hash)) {
            $tentativas = $acesso->tentativas + 1;
            $update = ['tentativas' => $tentativas, 'updated_at' => now()];

            if ($tentativas >= self::MAX_TENTATIVAS) {
                $update['bloqueado_ate'] = now()->addMinutes(self::BLOQUEIO_MINUTOS);
                $update['tentativas']    = 0;
            }

            DB::table('contador_acessos')->where('id', $acesso->id)->update($update);

            $restantes = self::MAX_TENTATIVAS - $tentativas;
            $msg = $restantes > 0
                ? "PIN incorreto. {$restantes} tentativa(s) restante(s)."
                : "Acesso bloqueado por " . self::BLOQUEIO_MINUTOS . " minutos.";

            return response()->json(['message' => $msg], 401);
        }

        DB::table('contador_acessos')->where('id', $acesso->id)
            ->update(['tentativas' => 0, 'bloqueado_ate' => null]);

        return response()->json(['sessao_token' => $this->criarSessao($acesso->id)]);
    }

    // ── GET /contador/{token}/dados — dados fiscais (requer sessão) ───────────

    public function dados(Request $request, string $token): JsonResponse
    {
        $acesso = $this->buscarAcesso($token);
        $this->autorizarSessao($acesso, $request);

        DB::table('contador_acessos')->where('id', $acesso->id)
            ->update(['ultimo_acesso' => now(), 'updated_at' => now()]);

        $mes = $request->get('mes', now()->format('Y-m'));

        $totais = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $acesso->fazenda_id)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->selectRaw("
                SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas
            ")
            ->first();

        $lancamentos = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $acesso->fazenda_id)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->orderByDesc('data')
            ->get();

        $fazenda = DB::table('fazendas')->find($acesso->fazenda_id);

        return response()->json([
            'nome_fazenda' => $fazenda?->nome,
            'mes'          => $mes,
            'receitas_mes' => (float) ($totais->receitas ?? 0),
            'despesas_mes' => (float) ($totais->despesas ?? 0),
            'saldo_mes'    => (float) (($totais->receitas ?? 0) - ($totais->despesas ?? 0)),
            'lancamentos'  => $lancamentos,
        ]);
    }

    // ── GET /contador/{token}/exportar — CSV (requer sessão) ─────────────────

    public function exportar(Request $request, string $token): Response
    {
        $acesso = $this->buscarAcesso($token);
        $this->autorizarSessao($acesso, $request);

        $query = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $acesso->fazenda_id)
            ->orderByDesc('data');

        if ($request->filled('mes')) {
            $query->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$request->mes]);
        }

        $linhas = $query->get();

        $csv  = "\xEF\xBB\xBF";
        $csv .= "Data;Tipo;Categoria;Descrição;Valor\n";

        foreach ($linhas as $l) {
            $tipo      = $l->tipo === 'receita' ? 'Receita' : 'Despesa';
            $descricao = str_replace([';', "\n"], [',', ' '], $l->descricao ?? '');
            $valor     = number_format($l->valor, 2, ',', '.');
            $csv      .= "{$l->data};{$tipo};{$l->categoria};{$descricao};{$valor}\n";
        }

        $periodo = $request->filled('mes') ? $request->mes : now()->format('Y');

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"lancamentos-fiscais-{$periodo}.csv\"",
        ]);
    }

    // ── GET /contador/{token}/inventario — inventário do rebanho ─────────────

    public function inventario(Request $request, string $token): JsonResponse
    {
        $acesso = $this->buscarAcesso($token);
        $this->autorizarSessao($acesso, $request);

        $dataRef = $request->get('data', now()->toDateString());

        $fazenda = DB::table('fazendas')->find($acesso->fazenda_id);

        $q = DB::table('rebanho')
            ->where('fazenda_id', $acesso->fazenda_id)
            ->where(function ($query) use ($dataRef) {
                $query->where('status', 'ativo')
                      ->orWhere(function ($q2) use ($dataRef) {
                          $q2->whereIn('status', ['vendido', 'morto', 'transferido'])
                             ->whereDate('updated_at', '>', $dataRef);
                      });
            })
            ->whereDate('created_at', '<=', $dataRef);

        $categorias = (clone $q)
            ->selectRaw('
                categoria,
                COUNT(*) as total,
                SUM(CASE WHEN sexo = "macho" THEN 1 ELSE 0 END) as machos,
                SUM(CASE WHEN sexo = "femea" THEN 1 ELSE 0 END) as femeas,
                ROUND(AVG(CASE WHEN peso_atual > 0 THEN peso_atual END), 1) as peso_medio,
                ROUND(SUM(COALESCE(peso_atual, 0)), 0) as peso_total
            ')
            ->groupBy('categoria')
            ->orderByRaw("FIELD(categoria,'vaca','novilha','bezerra','touro','boi','novilho','bezerro')")
            ->get();

        $total     = (clone $q)->count();
        $pesoTotal = (clone $q)->sum('peso_atual');

        return response()->json([
            'fazenda_nome'  => $fazenda?->nome,
            'data_ref'      => $dataRef,
            'gerado_em'     => now()->toDateTimeString(),
            'total_cabecas' => $total,
            'total_machos'  => (clone $q)->where('sexo', 'macho')->count(),
            'total_femeas'  => (clone $q)->where('sexo', 'femea')->count(),
            'peso_medio'    => $total > 0 ? round($pesoTotal / $total, 1) : 0,
            'peso_total'    => round($pesoTotal, 0),
            'categorias'    => $categorias,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function criarSessao(int $acessoId): string
    {
        $sessaoToken = Str::random(48);
        DB::table('contador_acessos')->where('id', $acessoId)->update([
            'sessao_token'     => $sessaoToken,
            'sessao_expira_em' => now()->addHours(self::SESSAO_HORAS),
            'updated_at'       => now(),
        ]);
        return $sessaoToken;
    }

    private function autorizarSessao(object $acesso, Request $request): void
    {
        // Link sem PIN não precisa de sessão
        if (is_null($acesso->pin_hash)) return;

        abort_if(!$this->verificarSessao($acesso, $request), 401, 'Sessão inválida. Faça login novamente.');
    }
}
