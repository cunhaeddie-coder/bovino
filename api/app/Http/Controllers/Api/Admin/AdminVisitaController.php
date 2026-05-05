<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Visita;
use Illuminate\Http\Request;

class AdminVisitaController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Visita::with([
                'anuncio:id,titulo,raca',
                'comprador:id,nome,celular',
                'vendedor:id,nome,celular',
            ])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(25)
        );
    }
}
