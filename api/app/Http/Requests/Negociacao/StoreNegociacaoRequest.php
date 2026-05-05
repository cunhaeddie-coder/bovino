<?php

namespace App\Http\Requests\Negociacao;

use App\Models\Negociacao;
use Illuminate\Foundation\Http\FormRequest;

class StoreNegociacaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'anuncio_id'       => ['required', 'exists:anuncios,id'],
            'preco_proposto'   => ['nullable', 'numeric', 'min:0'],
            'mensagem_inicial' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $anuncioId   = $this->anuncio_id;
            $compradorId = $this->user()->id;

            // Não pode negociar com próprio anúncio
            $dono = \App\Models\Anuncio::where('id', $anuncioId)
                ->where('user_id', $compradorId)
                ->exists();

            if ($dono) {
                $v->errors()->add('anuncio_id', 'Não pode negociar com seu próprio anúncio.');
            }

            // Negociação aberta já existe
            $existente = Negociacao::where('anuncio_id', $anuncioId)
                ->where('comprador_id', $compradorId)
                ->where('status', 'aberta')
                ->exists();

            if ($existente) {
                $v->errors()->add('anuncio_id', 'Já existe uma negociação aberta para este anúncio.');
            }
        });
    }
}
