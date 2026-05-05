<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = Admin::where('email', $data['email'])->first();

        if (!$admin || !Hash::check($data['password'], $admin->password)) {
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        if (!$admin->ativo) {
            return response()->json(['message' => 'Conta suspensa.'], 403);
        }

        $admin->tokens()->delete();
        $admin->update(['ultimo_acesso' => now()]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        return response()->json(['admin' => $admin, 'token' => $token]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logout realizado.']);
    }
}
