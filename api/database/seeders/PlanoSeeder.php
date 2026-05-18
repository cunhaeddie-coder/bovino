<?php

namespace Database\Seeders;

use App\Models\Plano;
use Illuminate\Database\Seeder;

class PlanoSeeder extends Seeder
{
    public function run(): void
    {
        // ── PLANOS PRINCIPAIS ────────────────────────────────────────────────

        Plano::updateOrCreate(['slug' => 'produtor-premium'], [
            'nome'                 => 'Premium',
            'tipo'                 => 'produtor',
            'preco'                => 150.00,
            'preco_anual'          => 1650.00,
            'periodo'              => 'mensal',
            'ordem'                => 1,
            'max_anuncios'         => 50,
            'max_destaques'        => 10,
            'max_cabecas'          => 300,
            'ver_contato_vendedor' => true,
            'alertas_preco'        => true,
            'analytics'            => true,
            'badge_verificado'     => true,
            'suporte_prioritario'  => false,
            'recursos'             => [
                'Até 300 cabeças de gado no sistema',
                'Até 50 anúncios ativos no marketplace',
                '10 anúncios em destaque por mês',
                'Página de fazenda pública (mini-site)',
                'Ver WhatsApp e telefone de outros vendedores',
                'Gestão de rebanho: animais, saúde, vacinas e pesagens',
                'App Pasto e App Curral (campo digital)',
                'Financeiro por lote com gráfico de caixa',
                'Importação de NF-e via XML',
                'BoviScore — índice de saúde do rebanho',
                'Projeção de venda e preço de equilíbrio',
                'Alertas de preço e demanda por região',
                'Badge "Verificado" no perfil',
                'Suporte por WhatsApp',
            ],
        ]);

        $eliteRecursos = [
            'Rebanho até o limite da faixa contratada',
            'Anúncios ilimitados no marketplace',
            '20 anúncios em destaque por mês',
            'Página de fazenda com avaliações verificadas',
            'Ver WhatsApp e telefone de todos os usuários',
            'Gestão completa: rebanho, reprodução, pasto e curral',
            'Módulo reprodutivo (cobertura, gestação, parto)',
            'Banco Genético (touros, sêmen, partidas)',
            'Plano Nutricional por lote',
            'Módulo Leiteiro — controle de produção',
            'Financeiro completo com relatórios e gráficos',
            'Importação de NF-e e módulo fiscal',
            'IA Gestor — análise inteligente do rebanho',
            'Inteligência: Minha @ vs Mercado, Raças em Números, Desempenho por Origem',
            'BoviScore avançado com histórico de evolução',
            'Gestão de pastagens e rotação de piquetes',
            'Entradas e Saídas consolidadas (aquisições, vendas, perdas)',
            'GTA digital e rastreabilidade SISBOV',
            'Alertas de demanda ilimitados',
            'Prioridade máxima nas buscas',
            'Badge "Elite" no perfil e anúncios',
            'Suporte prioritário 7 dias por semana',
        ];

        foreach ([
            ['slug' => 'produtor-elite-500',   'nome' => 'Elite',  'preco' => 280.00, 'preco_anual' => 3080.00, 'max_cabecas' => 500,   'ordem' => 2],
            ['slug' => 'produtor-elite-1000',  'nome' => 'Elite',  'preco' => 330.00, 'preco_anual' => 3630.00, 'max_cabecas' => 1000,  'ordem' => 3],
            ['slug' => 'produtor-elite-5000',  'nome' => 'Elite',  'preco' => 420.00, 'preco_anual' => 4620.00, 'max_cabecas' => 5000,  'ordem' => 4],
            ['slug' => 'produtor-elite-10000', 'nome' => 'Elite',  'preco' => 550.00, 'preco_anual' => 6050.00, 'max_cabecas' => 10000, 'ordem' => 5],
        ] as $faixa) {
            Plano::updateOrCreate(['slug' => $faixa['slug']], array_merge($faixa, [
                'tipo'                 => 'produtor',
                'periodo'              => 'mensal',
                'max_anuncios'         => 0,
                'max_destaques'        => 20,
                'ver_contato_vendedor' => true,
                'alertas_preco'        => true,
                'analytics'            => true,
                'badge_verificado'     => true,
                'suporte_prioritario'  => true,
                'recursos'             => $eliteRecursos,
            ]));
        }

        // ── ANUNCIANTES (sem alterações) ──────────────────────────────────────

        foreach ([
            ['slug' => 'anunciante-regional', 'nome' => 'Regional', 'preco' => 500.00, 'ordem' => 1, 'recursos' => [
                'Banner em até 2 estados', '1 posição ativa (feed ou busca)',
                'Até 50.000 impressões/mês', 'Relatório mensal de cliques e impressões',
                'Painel de gerenciamento de banners',
            ]],
            ['slug' => 'anunciante-nacional', 'nome' => 'Nacional', 'preco' => 1000.00, 'ordem' => 2, 'recursos' => [
                'Banner nacional (todos os estados)', '2 posições ativas (feed + busca)',
                'Até 200.000 impressões/mês', 'Relatório semanal detalhado',
                'Painel de gerenciamento completo', 'Suporte dedicado',
            ]],
            ['slug' => 'anunciante-nacional-premium', 'nome' => 'Nacional Premium', 'preco' => 2000.00, 'ordem' => 3, 'recursos' => [
                'Banner na homepage (posição principal)', '3 posições ativas (home + feed + busca)',
                'Até 500.000 impressões/mês', 'Relatório em tempo real',
                'Banners personalizados por público-alvo', 'Gerente de conta dedicado', 'Suporte 24/7',
            ]],
        ] as $an) {
            Plano::updateOrCreate(['slug' => $an['slug']], array_merge($an, [
                'tipo' => 'anunciante', 'periodo' => 'mensal',
                'preco_anual' => null, 'max_cabecas' => null,
                'max_anuncios' => 0, 'max_destaques' => 0,
                'ver_contato_vendedor' => false, 'alertas_preco' => false,
                'analytics' => true, 'badge_verificado' => false,
                'suporte_prioritario' => $an['slug'] === 'anunciante-nacional-premium',
            ]));
        }

        // Desativa planos antigos substituídos
        Plano::whereIn('slug', ['comprador-premium', 'produtor-basico', 'produtor-elite'])
            ->update(['ativo' => false]);
    }
}
