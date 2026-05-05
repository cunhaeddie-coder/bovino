<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        // Normaliza celular se foi enviado (remove não-dígitos)
        if ($this->celular) {
            $this->merge(['celular' => preg_replace('/\D/', '', $this->celular)]);
        }
    }

    public function rules(): array
    {
        return [
            'celular'  => ['nullable', 'string', 'min:10', 'max:13'],
            'email'    => ['nullable', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (!$this->celular && !$this->email) {
                $v->errors()->add('celular', 'Informe o celular ou o e-mail.');
            }
        });
    }
}
