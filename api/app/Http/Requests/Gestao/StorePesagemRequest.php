<?php

namespace App\Http\Requests\Gestao;

use Illuminate\Foundation\Http\FormRequest;

class StorePesagemRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'animal_id'    => ['nullable', 'exists:rebanho,id'],
            'lote_id'      => ['nullable', 'exists:lotes_gestao,id'],
            'peso'         => ['required', 'numeric', 'min:0', 'max:9999'],
            'data_pesagem' => ['required', 'date', 'before_or_equal:today'],
            'observacao'   => ['nullable', 'string', 'max:300'],
            'coletado_em'  => ['nullable', 'date'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (empty($this->animal_id) && empty($this->lote_id)) {
                $v->errors()->add('animal_id', 'Informe um animal ou um lote para a pesagem.');
            }
        });
    }
}
