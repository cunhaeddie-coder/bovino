<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminEquipeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->requireSuper($request);

        $admins = Admin::orderBy('nome')
            ->paginate(50);

        return response()->json($admins);
    }

    public function store(Request $request): JsonResponse
    {
        $this->requireSuper($request);

        $data = $request->validate([
            'nome'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'unique:admins,email'],
            'password' => ['required', 'string', 'min:8'],
            'papel'          => ['required', Rule::in(['super', 'operador', 'ti', 'vendas', 'treinamento', 'tecnico'])],
            'tipo_contrato'  => ['sometimes', Rule::in(['clt', 'pj', 'freelancer', 'estagio'])],
        ]);

        $admin = Admin::create([
            'nome'          => $data['nome'],
            'email'         => $data['email'],
            'password'      => Hash::make($data['password']),
            'papel'         => $data['papel'],
            'tipo_contrato' => $data['tipo_contrato'] ?? 'clt',
            'ativo'         => true,
        ]);

        return response()->json($admin, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->requireSuper($request);

        $admin = Admin::findOrFail($id);

        if ($admin->id === $request->user()->id) {
            return response()->json(['message' => 'Não é possível editar a própria conta aqui.'], 422);
        }

        $data = $request->validate([
            'nome'     => ['sometimes', 'string', 'max:120'],
            'email'    => ['sometimes', 'email', Rule::unique('admins', 'email')->ignore($id)],
            'password' => ['sometimes', 'string', 'min:8'],
            'papel'         => ['sometimes', Rule::in(['super', 'operador', 'ti', 'vendas', 'treinamento', 'tecnico'])],
            'tipo_contrato' => ['sometimes', Rule::in(['clt', 'pj', 'freelancer', 'estagio'])],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $admin->update($data);

        return response()->json($admin->fresh());
    }

    public function toggleAtivo(Request $request, int $id): JsonResponse
    {
        $this->requireSuper($request);

        $admin = Admin::findOrFail($id);

        if ($admin->id === $request->user()->id) {
            return response()->json(['message' => 'Não é possível desativar a própria conta.'], 422);
        }

        $admin->update(['ativo' => !$admin->ativo]);

        return response()->json(['ativo' => $admin->ativo]);
    }

    private function requireSuper(Request $request): void
    {
        if ($request->user()->papel !== 'super') {
            abort(403, 'Apenas super admins podem gerenciar a equipe.');
        }
    }
}
