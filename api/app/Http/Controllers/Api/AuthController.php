<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CadastroRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function __construct(private OtpService $otpService) {}

    public function cadastro(CadastroRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create($data);

        $codigo = $this->otpService->gerar($celular, 'cadastro');
        $this->otpService->enviarWhatsApp($celular, $codigo);

        return response()->json([
            'message' => 'Cadastro realizado. Verifique o WhatsApp para confirmar seu celular.',
            'user_id' => $user->id,
        ], 201);
    }

    public function verificarOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'celular' => ['required', 'string'],
            'codigo' => ['required', 'string', 'size:6'],
            'finalidade' => ['required', 'in:cadastro,login,recuperacao'],
        ]);

        $celular = preg_replace('/\D/', '', $data['celular']);

        if (!$this->otpService->verificar($celular, $data['codigo'], $data['finalidade'])) {
            return response()->json(['message' => 'Código inválido ou expirado.'], 422);
        }

        if ($data['finalidade'] === 'cadastro') {
            User::where('celular', $celular)->update(['verificado_celular' => true]);
        }

        return response()->json(['message' => 'Código verificado com sucesso.']);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $key  = 'login:' . ($data['celular'] ?? $data['email']);

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Muitas tentativas. Tente novamente em {$seconds} segundos.",
            ], 429);
        }

        $user = isset($data['celular']) && $data['celular']
            ? User::where('celular', $data['celular'])->first()
            : User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, 900);
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        if (!$user->verificado_celular) {
            return response()->json(['message' => 'Celular não verificado. Verifique o código enviado.'], 403);
        }

        RateLimiter::clear($key);

        $user->tokens()->where('name', 'access')->delete();
        $token = $user->createToken('access', ['*'], now()->addHours(8))->plainTextToken;

        $this->registrarAcesso($request, $user->id);

        $assinatura = $user->assinaturaAtiva();

        return response()->json([
            'token' => $token,
            'user' => [
                ...$user->only(['id', 'nome', 'celular', 'email', 'tipo', 'plano', 'verificado_celular', 'verificado_cpf']),
                'assinatura_ativa' => $assinatura ? [
                    'id'        => $assinatura->id,
                    'status'    => $assinatura->status,
                    'plano_id'  => $assinatura->plano_id,
                    'plano_slug'=> $assinatura->plano?->slug,
                    'plano_nome'=> $assinatura->plano?->nome,
                    'plano_tipo'=> $assinatura->plano?->tipo,
                    'expira_em' => $assinatura->expira_em,
                ] : null,
            ],
        ]);
    }

    public function enviarOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'celular'    => ['required', 'string'],
            'finalidade' => ['required', 'in:cadastro,login,recuperacao'],
        ]);

        $celular = preg_replace('/\D/', '', $data['celular']);

        if ($data['finalidade'] !== 'cadastro' && !User::where('celular', $celular)->exists()) {
            return response()->json(['message' => 'Celular não encontrado.'], 404);
        }

        $codigo          = $this->otpService->gerar($celular, $data['finalidade']);
        $whatsappEnviado = false;

        try {
            $whatsappEnviado = $this->otpService->enviarWhatsApp($celular, $codigo);
        } catch (\Exception $e) {}

        $response = ['message' => 'Código enviado via WhatsApp.', 'whatsapp_enviado' => $whatsappEnviado];
        if (!$whatsappEnviado) {
            $response['codigo_manual'] = $codigo;
            $response['aviso'] = 'WhatsApp não configurado. Use o código abaixo.';
        }

        return response()->json($response);
    }

    public function loginComOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'celular' => ['required', 'string'],
            'codigo'  => ['required', 'string', 'size:6'],
        ]);

        $celular = preg_replace('/\D/', '', $data['celular']);

        // Aceita OTP de cadastro (primeiro acesso) ou login
        $verificado = $this->otpService->verificar($celular, $data['codigo'], 'cadastro')
                   || $this->otpService->verificar($celular, $data['codigo'], 'login');

        if (!$verificado) {
            return response()->json(['message' => 'Código inválido ou expirado.'], 422);
        }

        $user = User::where('celular', $celular)->first();

        if (!$user) {
            return response()->json(['message' => 'Usuário não encontrado.'], 404);
        }

        // Marca celular como verificado no primeiro acesso
        if (!$user->verificado_celular) {
            $user->update(['verificado_celular' => true]);
        }

        $user->tokens()->where('name', 'access')->delete();
        $token = $user->createToken('access', ['*'], now()->addHours(8))->plainTextToken;

        // Inclui papel do funcionário vinculado (para vaqueiros)
        $funcionario = \App\Models\Funcionario::where('user_id', $user->id)->first();

        return response()->json([
            'token' => $token,
            'user'  => array_merge(
                $user->only(['id', 'nome', 'celular', 'email', 'tipo', 'plano', 'verificado_celular']),
                ['papel' => $funcionario?->papel]
            ),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $assinatura = $user->assinaturaAtiva();

        return response()->json([
            ...$user->only(['id', 'nome', 'celular', 'email', 'tipo', 'plano', 'verificado_celular', 'verificado_cpf']),
            'assinatura_ativa' => $assinatura ? [
                'id'        => $assinatura->id,
                'status'    => $assinatura->status,
                'plano_id'  => $assinatura->plano_id,
                'plano_slug'=> $assinatura->plano?->slug,
                'plano_nome'=> $assinatura->plano?->nome,
                'plano_tipo'=> $assinatura->plano?->tipo,
                'expira_em' => $assinatura->expira_em,
            ] : null,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout realizado.']);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('access', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json(['token' => $token]);
    }

    private function registrarAcesso(Request $request, int $userId): void
    {
        \DB::table('access_logs')->insert([
            'user_id' => $userId,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
