<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AtendimentoServicosSeeder extends Seeder
{
    public function run(): void
    {
        $servicos = [
            ['nome' => 'Implantação Básica',       'descricao' => 'Configuração inicial da conta, cadastro da fazenda e importação de até 50 animais.', 'valor' => 297.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 2.0, 'modalidade' => 'online',      'ordem' => 1],
            ['nome' => 'Implantação Completa',     'descricao' => 'Configuração completa + importação ilimitada de animais + treinamento 1:1.', 'valor' => 597.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 4.0, 'modalidade' => 'hibrido',    'ordem' => 2],
            ['nome' => 'Treinamento Online',       'descricao' => 'Treinamento personalizado para a equipe por videoconferência.', 'valor' => 197.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 2.0, 'modalidade' => 'online',      'ordem' => 3],
            ['nome' => 'Treinamento Presencial',   'descricao' => 'Visita à fazenda + treinamento completo da equipe.', 'valor' => 497.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 6.0, 'modalidade' => 'presencial',  'ordem' => 4],
            ['nome' => 'Migração de Dados',        'descricao' => 'Importação e organização de dados de planilhas Excel existentes.', 'valor' => 397.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 3.0, 'modalidade' => 'online',      'ordem' => 5],
            ['nome' => 'Suporte Dedicado Mensal',  'descricao' => 'Técnico exclusivo para dúvidas e suporte durante o mês.', 'valor' => 297.00, 'percentual_tecnico' => 40.00, 'duracao_horas' => 0.0, 'modalidade' => 'online',      'ordem' => 6],
        ];

        foreach ($servicos as $s) {
            DB::table('atendimento_servicos')->updateOrInsert(['nome' => $s['nome']], array_merge($s, [
                'ativo'      => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
