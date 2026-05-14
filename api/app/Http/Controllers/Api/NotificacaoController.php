<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificacaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifs = DB::table('notificacoes')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        return response()->json($notifs);
    }

    public function count(Request $request): JsonResponse
    {
        $naoLidas = DB::table('notificacoes')
            ->where('user_id', $request->user()->id)
            ->where('lida', false)
            ->count();

        return response()->json(['nao_lidas' => $naoLidas]);
    }

    public function marcarLida(Request $request, int $id): JsonResponse
    {
        DB::table('notificacoes')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['lida' => true]);

        return response()->json(['ok' => true]);
    }

    public function marcarTodasLidas(Request $request): JsonResponse
    {
        DB::table('notificacoes')
            ->where('user_id', $request->user()->id)
            ->where('lida', false)
            ->update(['lida' => true]);

        return response()->json(['ok' => true]);
    }
}
