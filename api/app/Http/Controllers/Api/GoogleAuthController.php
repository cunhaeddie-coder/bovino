<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback(): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url', 'https://bovino.agr.br');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect("{$frontendUrl}/login?error=google_falhou");
        }

        // Busca por google_id primeiro
        $user = User::where('google_id', $googleUser->getId())->first();

        // Se não achou, tenta pelo e-mail
        if (!$user && $googleUser->getEmail()) {
            $user = User::where('email', $googleUser->getEmail())->first();
            if ($user) {
                $user->update([
                    'google_id'  => $googleUser->getId(),
                    'avatar_url' => $googleUser->getAvatar(),
                ]);
            }
        }

        // Cria usuário novo se não existir
        if (!$user) {
            $user = User::create([
                'google_id'          => $googleUser->getId(),
                'nome'               => $googleUser->getName(),
                'email'              => $googleUser->getEmail(),
                'avatar_url'         => $googleUser->getAvatar(),
                'verificado_celular' => true,
            ]);
        }

        $user->tokens()->where('name', 'access')->delete();
        $token = $user->createToken('access', ['*'], now()->addHours(8))->plainTextToken;

        $userData = urlencode(base64_encode(json_encode($user->only([
            'id', 'nome', 'email', 'tipo', 'plano', 'verificado_celular', 'verificado_cpf', 'avatar_url',
        ]))));

        return redirect("{$frontendUrl}/auth/google/callback?token=" . urlencode($token) . "&user={$userData}");
    }
}
