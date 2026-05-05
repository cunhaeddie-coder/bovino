<?php

namespace Database\Seeders;

use App\Models\Assinatura;
use App\Models\Fazenda;
use App\Models\Plano;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CreateGenildaSeeder extends Seeder
{
    public function run(): void
    {
        $plano = Plano::where('slug', 'produtor-elite')->firstOrFail();

        $user = User::updateOrCreate(
            ['email' => 'genildacleyde.23@hotmail.com'],
            [
                'nome'               => 'Genilda Cleide da Cunha',
                'cpf'                => '93008279287',
                'celular'            => '69900000000',
                'email'              => 'genildacleyde.23@hotmail.com',
                'password'           => '12345678', // cast 'hashed' do model aplica bcrypt
                'tipo'               => 'vendedor',
                'plano'              => 'premium',
                'verificado_cpf'     => true,
                'verificado_celular' => true,
                'estado'             => 'RO',
                'municipio'          => 'Buritis',
                'cep'                => '76880-000',
                'nome_propriedade'   => 'Sítio Boa Esperança',
            ]
        );

        Fazenda::updateOrCreate(
            ['user_id' => $user->id],
            [
                'nome'      => 'Sítio Boa Esperança',
                'slug'      => Str::slug('Sitio Boa Esperanca-' . $user->id),
                'estado'    => 'RO',
                'municipio' => 'Buritis',
                'ativo'     => true,
            ]
        );

        // Cancela assinaturas anteriores se existirem
        $user->assinaturas()->where('status', 'ativa')->update(['status' => 'cancelada']);

        Assinatura::create([
            'assinante_type' => User::class,
            'assinante_id'   => $user->id,
            'plano_id'       => $plano->id,
            'status'         => 'ativa',
            'valor'          => $plano->preco,
            'inicia_em'      => now(),
            'expira_em'      => null,
        ]);

        $this->command->info("Usuário criado: {$user->nome} (ID {$user->id}) — plano {$plano->nome}");
    }
}
