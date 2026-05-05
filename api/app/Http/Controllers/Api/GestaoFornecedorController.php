<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fazenda;
use App\Models\Fornecedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoFornecedorController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $q = Fornecedor::where('fazenda_id', $fazenda->id);
        if ($request->filled('categoria')) $q->where('categoria', $request->categoria);
        if ($request->filled('busca')) $q->where('nome', 'like', "%{$request->busca}%");
        if ($request->filled('ativo')) $q->where('ativo', $request->boolean('ativo'));
        return response()->json($q->orderBy('nome')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'nome'         => ['required','string','max:200'],
            'cnpj_cpf'     => ['nullable','string','max:20'],
            'telefone'     => ['nullable','string','max:20'],
            'email'        => ['nullable','email'],
            'categoria'    => ['required','in:insumos,medicamentos,servicos,equipamentos,outros'],
            'contato_nome' => ['nullable','string'],
            'estado'       => ['nullable','string','size:2'],
            'municipio'    => ['nullable','string'],
            'observacoes'  => ['nullable','string'],
        ]);
        $fornecedor = Fornecedor::create(['fazenda_id' => $fazenda->id] + $data);
        return response()->json($fornecedor, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $fornecedor = Fornecedor::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $fornecedor->update($request->except(['fazenda_id']));
        return response()->json($fornecedor);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        Fornecedor::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Fornecedor removido.']);
    }
}
