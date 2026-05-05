<?php

namespace App\Services;

use App\Models\Otp;
use Illuminate\Support\Str;

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
            'celular' => $celular,
            'codigo' => $codigo,
            'finalidade' => $finalidade,
            'expira_em' => now()->addMinutes(10),
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

    public function enviarWhatsApp(string $celular, string $codigo): void
    {
        // Integração Z-API — implementar conforme credenciais
        // $mensagem = "Seu código Bovino: *{$codigo}*. Válido por 10 minutos.";
        // ZApiClient::send($celular, $mensagem);
    }

    public function enviarSms(string $celular, string $codigo): void
    {
        // Fallback Twilio
    }
}
