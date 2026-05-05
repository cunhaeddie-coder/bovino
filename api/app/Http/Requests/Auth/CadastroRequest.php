<?php

namespace App\Http\Requests\Auth;

use App\Services\CpfService;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class CadastroRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'cpf'     => preg_replace('/\D/', '', $this->cpf ?? ''),
            'celular' => preg_replace('/\D/', '', $this->celular ?? ''),
        ]);
    }

    public function rules(): array
    {
        return [
            'nome'             => ['required', 'string', 'max:255'],
            'cpf'              => ['required', 'string', 'size:11'],
            'celular'          => ['required', 'string', 'min:10', 'max:11'],
            'email'            => ['nullable', 'email', 'unique:users'],
            'password'         => ['required', Password::min(8)->numbers()->symbols()],
            'tipo'             => ['required', 'in:vendedor,comprador,ambos'],
            'cep'              => ['nullable', 'string', 'max:9'],
            'estado'           => ['nullable', 'string', 'size:2'],
            'municipio'        => ['nullable', 'string', 'max:255'],
            'endereco'         => ['nullable', 'string', 'max:255'],
            'numero'           => ['nullable', 'string', 'max:20'],
            'complemento'      => ['nullable', 'string', 'max:100'],
            'bairro'           => ['nullable', 'string', 'max:255'],
            'nome_propriedade' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (!CpfService::validar($this->cpf)) {
                $v->errors()->add('cpf', 'CPF inválido.');
            }
            if (User::where('cpf', $this->cpf)->exists()) {
                $v->errors()->add('cpf', 'CPF já cadastrado.');
            }
            if (User::where('celular', $this->celular)->exists()) {
                $v->errors()->add('celular', 'Celular já cadastrado.');
            }
        });
    }
}
