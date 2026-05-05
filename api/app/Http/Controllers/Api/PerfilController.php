<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PerfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('anuncios'));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:users,email,' . $request->user()->id],
            'estado' => ['nullable', 'string', 'size:2'],
            'municipio' => ['nullable', 'string', 'max:255'],
            'tipo' => ['sometimes', 'in:vendedor,comprador,ambos'],
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->fresh());
    }

    public function alterarSenha(Request $request): JsonResponse
    {
        $data = $request->validate([
            'senha_atual' => ['required', 'string'],
            'nova_senha' => ['required', Password::min(8)->numbers()->symbols(), 'confirmed'],
        ]);

        if (!Hash::check($data['senha_atual'], $request->user()->password)) {
            return response()->json(['message' => 'Senha atual incorreta.'], 422);
        }

        $request->user()->update(['password' => $data['nova_senha']]);

        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Senha alterada. Faça login novamente.']);
    }

    public function publico(int $id): JsonResponse
    {
        $user = \App\Models\User::findOrFail($id);

        return response()->json([
            'id' => $user->id,
            'nome' => $user->nome,
            'estado' => $user->estado,
            'municipio' => $user->municipio,
            'verificado_cpf' => $user->verificado_cpf,
            'verificado_celular' => $user->verificado_celular,
            'membro_desde' => $user->created_at->format('Y-m'),
            'total_anuncios' => $user->anuncios()->count(),
        ]);
    }
}
