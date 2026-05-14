<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function avancar(Request $request): JsonResponse
    {
        $user  = $request->user();
        $etapa = (int) $request->input('etapa', $user->onboarding_etapa + 1);

        // Etapa 2 — salva dados básicos da propriedade
        if ($etapa === 2) {
            $data = $request->validate([
                'nome_propriedade' => ['nullable', 'string', 'max:120'],
                'estado'           => ['nullable', 'string', 'max:2'],
                'municipio'        => ['nullable', 'string', 'max:120'],
            ]);
            $user->fill(array_filter($data, fn($v) => $v !== null && $v !== ''))->save();
        }

        if ($etapa > $user->onboarding_etapa) {
            $user->update(['onboarding_etapa' => $etapa]);
        }

        return response()->json(['ok' => true, 'etapa' => $user->fresh()->onboarding_etapa]);
    }

    public function pular(Request $request): JsonResponse
    {
        $request->user()->update(['onboarding_etapa' => 3]);

        return response()->json(['ok' => true]);
    }
}
