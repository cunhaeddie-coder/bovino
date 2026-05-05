<?php

namespace App\Http\Requests\Gestao;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompraInsumoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'fornecedor_id'          => ['nullable', 'exists:fornecedores,id'],
            'data_compra'            => ['required', 'date', 'before_or_equal:today'],
            'nota_fiscal'            => ['nullable', 'string', 'max:50'],
            'forma_pagamento'        => ['nullable', 'in:dinheiro,pix,boleto,cartao,prazo'],
            'data_vencimento'        => ['nullable', 'date', 'after_or_equal:data_compra'],
            'observacoes'            => ['nullable', 'string', 'max:1000'],
            'itens'                  => ['required', 'array', 'min:1'],
            'itens.*.insumo_id'      => ['required', 'exists:insumos,id'],
            'itens.*.quantidade'     => ['required', 'numeric', 'min:0.001'],
            'itens.*.valor_unitario' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'itens.required'              => 'A compra deve ter ao menos um item.',
            'itens.*.insumo_id.exists'    => 'Insumo inválido na linha :index.',
            'itens.*.quantidade.min'      => 'Quantidade deve ser maior que zero.',
            'data_vencimento.after_or_equal' => 'Vencimento não pode ser anterior à data da compra.',
        ];
    }
}
