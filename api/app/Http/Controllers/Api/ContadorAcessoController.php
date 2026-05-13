<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ContadorAcessoController extends Controller
{
    private function fazendaId(Request $request): int
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda->id;
    }

    public function show(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $acesso = DB::table('contador_acessos')
            ->where('fazenda_id', $fazendaId)
            ->where('ativo', true)
            ->select('id', 'token', 'nome', 'expira_em', 'ultimo_acesso',
                     DB::raw('pin_hash IS NOT NULL as tem_pin'))
            ->first();

        return response()->json($acesso);
    }

    public function salvar(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $data = $request->validate([
            'nome'     => ['nullable', 'string', 'max:120'],
            'pin'      => ['nullable', 'string', 'digits_between:4,6'],
            'expira_em'=> ['nullable', 'date', 'after:today'],
        ]);

        $acesso = DB::table('contador_acessos')
            ->where('fazenda_id', $fazendaId)
            ->where('ativo', true)
            ->first();

        $payload = [
            'nome'       => $data['nome'] ?? null,
            'expira_em'  => $data['expira_em'] ?? null,
            'updated_at' => now(),
        ];

        if (isset($data['pin'])) {
            $payload['pin_hash']    = Hash::make($data['pin']);
            $payload['tentativas']  = 0;
            $payload['bloqueado_ate'] = null;
            // invalida sessões abertas ao trocar o PIN
            $payload['sessao_token']    = null;
            $payload['sessao_expira_em'] = null;
        }

        if ($acesso) {
            DB::table('contador_acessos')->where('id', $acesso->id)->update($payload);
            $token = $acesso->token;
        } else {
            $token = Str::random(48);
            DB::table('contador_acessos')->insert(array_merge($payload, [
                'user_id'    => $request->user()->id,
                'fazenda_id' => $fazendaId,
                'token'      => $token,
                'ativo'      => true,
                'created_at' => now(),
            ]));
        }

        return response()->json(['token' => $token]);
    }

    public function revogar(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        DB::table('contador_acessos')
            ->where('fazenda_id', $fazendaId)
            ->update(['ativo' => false, 'updated_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function renovarToken(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $novoToken = Str::random(48);

        DB::table('contador_acessos')
            ->where('fazenda_id', $fazendaId)
            ->where('ativo', true)
            ->update([
                'token'           => $novoToken,
                'sessao_token'    => null,
                'sessao_expira_em'=> null,
                'updated_at'      => now(),
            ]);

        return response()->json(['token' => $novoToken]);
    }
}
