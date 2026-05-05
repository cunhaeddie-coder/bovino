<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertaDemanda;
use Illuminate\Http\Request;

class AlertaDemandaController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->alertasDemanda()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'raca'      => 'nullable|string|max:60',
            'estados'   => 'nullable|array',
            'estados.*' => 'string|size:2',
            'categoria' => 'nullable|string|max:60',
            'sexo'      => 'nullable|in:macho,femea,misto',
            'peso_min'  => 'nullable|numeric|min:0',
            'peso_max'  => 'nullable|numeric|min:0',
        ]);

        $alerta = $request->user()->alertasDemanda()->create($data);
        return response()->json($alerta, 201);
    }

    public function update(Request $request, int $id)
    {
        $alerta = $request->user()->alertasDemanda()->findOrFail($id);
        $alerta->update($request->validate(['ativo' => 'required|boolean']));
        return response()->json($alerta->fresh());
    }

    public function destroy(Request $request, int $id)
    {
        $request->user()->alertasDemanda()->findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
