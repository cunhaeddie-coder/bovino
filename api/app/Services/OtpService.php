<?php

namespace App\Services;

use App\Models\Otp;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpService
{
    public function gerar(string $celular, string $finalidade): string
    {
        Otp::where('celular', $celular)
            ->where('finalidade', $finalidade)
            ->where('usado', false)
            ->delete();

        $codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Otp::create([
            'celular'    => $celular,
            'codigo'     => $codigo,
            'finalidade' => $finalidade,
            'expira_em'  => now()->addMinutes(10),
        ]);

        return $codigo;
    }

    public function verificar(string $celular, string $codigo, string $finalidade): bool
    {
        $otp = Otp::where('celular', $celular)
            ->where('codigo', $codigo)
            ->where('finalidade', $finalidade)
            ->where('usado', false)
            ->where('expira_em', '>', now())
            ->first();

        if (!$otp) {
            return false;
        }

        $otp->update(['usado' => true]);

        return true;
    }

    /**
     * Envia OTP via Z-API WhatsApp.
     * Retorna true em sucesso, false se as credenciais não estiverem configuradas,
     * lança exceção em falha de API.
     */
    public function enviarWhatsApp(string $celular, string $codigo): bool
    {
        $instanceId  = config('services.zapi.instance_id');
        $token       = config('services.zapi.token');
        $clientToken = config('services.zapi.client_token');

        if (!$instanceId || !$token) {
            Log::warning('OtpService: Z-API não configurado — OTP não enviado.', [
                'celular' => $celular,
            ]);
            return false;
        }

        // Garante formato 55XXXXXXXXXXX
        $fone = $this->formatarCelular($celular);

        $mensagem = "🐄 *Bovino* — seu código de acesso:\n\n*{$codigo}*\n\nVálido por 10 minutos. Não compartilhe.";

        $url = "https://api.z-api.io/instances/{$instanceId}/token/{$token}/send-text";

        $headers = ['Content-Type' => 'application/json'];
        if ($clientToken) {
            $headers['Client-Token'] = $clientToken;
        }

        $response = Http::withHeaders($headers)
            ->timeout(15)
            ->post($url, [
                'phone'   => $fone,
                'message' => $mensagem,
            ]);

        if (!$response->successful()) {
            Log::error('OtpService: falha ao enviar WhatsApp via Z-API.', [
                'celular' => $celular,
                'status'  => $response->status(),
                'body'    => $response->body(),
            ]);
            throw new \RuntimeException("Z-API retornou HTTP {$response->status()}: {$response->body()}");
        }

        Log::info('OtpService: WhatsApp enviado.', ['celular' => $celular]);

        return true;
    }

    public function enviarSms(string $celular, string $codigo): bool
    {
        $sid   = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from  = config('services.twilio.from');

        if (!$sid || !$token || !$from) {
            Log::warning('OtpService: Twilio não configurado — SMS não enviado.');
            return false;
        }

        $fone    = '+55' . preg_replace('/\D/', '', $celular);
        $mensagem = "Bovino: seu código é {$codigo}. Válido 10 min.";

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->timeout(15)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'From' => $from,
                'To'   => $fone,
                'Body' => $mensagem,
            ]);

        if (!$response->successful()) {
            Log::error('OtpService: falha Twilio SMS.', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException("Twilio retornou HTTP {$response->status()}");
        }

        return true;
    }

    private function formatarCelular(string $celular): string
    {
        $digits = preg_replace('/\D/', '', $celular);

        // Já tem DDI 55
        if (strlen($digits) === 13 && str_starts_with($digits, '55')) {
            return $digits;
        }

        // DDD + 9 dígitos (Brasil)
        if (strlen($digits) === 11) {
            return '55' . $digits;
        }

        // DDD + 8 dígitos (fixo ou número sem 9)
        if (strlen($digits) === 10) {
            return '55' . $digits;
        }

        return '55' . $digits;
    }
}
