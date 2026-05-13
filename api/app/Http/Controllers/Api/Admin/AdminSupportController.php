<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSupportController extends Controller
{
    // ── Lista conversas ───────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = DB::table('suporte_conversas as sc')
            ->leftJoin('admins as a', 'a.id', '=', 'sc.admin_id')
            ->select(
                'sc.id', 'sc.user_nome', 'sc.user_plano', 'sc.fazenda_nome',
                'sc.status', 'sc.resumo', 'sc.created_at', 'sc.updated_at',
                'a.nome as admin_nome',
                DB::raw('(SELECT COUNT(*) FROM suporte_mensagens WHERE conversa_id = sc.id) as total_mensagens'),
                DB::raw('(SELECT created_at FROM suporte_mensagens WHERE conversa_id = sc.id ORDER BY created_at DESC LIMIT 1) as ultima_mensagem_em')
            )
            ->orderByDesc('sc.updated_at');

        if ($request->filled('status')) {
            $query->where('sc.status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    // ── Contadores para badge no sidebar ─────────────────────────────────────

    public function pendentes(): JsonResponse
    {
        $counts = DB::table('suporte_conversas')
            ->selectRaw("
                SUM(CASE WHEN status = 'aberta'          THEN 1 ELSE 0 END) as abertas,
                SUM(CASE WHEN status = 'escalada'        THEN 1 ELSE 0 END) as escaladas,
                SUM(CASE WHEN status = 'em_atendimento'  THEN 1 ELSE 0 END) as em_atendimento
            ")
            ->first();

        return response()->json([
            'abertas'        => (int) ($counts->abertas ?? 0),
            'escaladas'      => (int) ($counts->escaladas ?? 0),
            'em_atendimento' => (int) ($counts->em_atendimento ?? 0),
            'total_pendentes'=> (int) (($counts->abertas ?? 0) + ($counts->escaladas ?? 0)),
        ]);
    }

    // ── Detalhe de uma conversa ───────────────────────────────────────────────

    public function show(int $id): JsonResponse
    {
        $conversa = DB::table('suporte_conversas as sc')
            ->leftJoin('admins as a', 'a.id', '=', 'sc.admin_id')
            ->select('sc.*', 'a.nome as admin_nome')
            ->where('sc.id', $id)
            ->first();

        abort_if(!$conversa, 404);

        $mensagens = DB::table('suporte_mensagens as sm')
            ->leftJoin('admins as a', 'a.id', '=', 'sm.admin_id')
            ->select('sm.*', 'a.nome as admin_nome')
            ->where('sm.conversa_id', $id)
            ->orderBy('sm.created_at')
            ->get();

        return response()->json(['conversa' => $conversa, 'mensagens' => $mensagens]);
    }

    // ── Admin responde manualmente ────────────────────────────────────────────

    public function responder(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $data = $request->validate([
            'conteudo' => ['required', 'string', 'max:3000'],
        ]);

        $conversa = DB::table('suporte_conversas')->find($id);
        abort_if(!$conversa, 404);

        DB::table('suporte_mensagens')->insert([
            'conversa_id' => $id,
            'papel'       => 'admin',
            'conteudo'    => $data['conteudo'],
            'admin_id'    => $admin->id,
            'created_at'  => now(),
        ]);

        DB::table('suporte_conversas')->where('id', $id)->update([
            'status'     => 'em_atendimento',
            'admin_id'   => $admin->id,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    // ── Resolver conversa ─────────────────────────────────────────────────────

    public function resolver(int $id, Request $request): JsonResponse
    {
        DB::table('suporte_conversas')->where('id', $id)->update([
            'status'     => 'resolvida',
            'admin_id'   => $request->user()->id,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    // ── Escalar conversa ──────────────────────────────────────────────────────

    public function escalar(int $id, Request $request): JsonResponse
    {
        DB::table('suporte_conversas')->where('id', $id)->update([
            'status'     => 'escalada',
            'admin_id'   => $request->user()->id,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }
}
