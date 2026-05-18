<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $premiumRecursos = [
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
        ];

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

        DB::table('planos')
            ->where('slug', 'produtor-premium')
            ->update(['recursos' => json_encode($premiumRecursos)]);

        DB::table('planos')
            ->whereIn('slug', [
                'produtor-elite-500',
                'produtor-elite-1000',
                'produtor-elite-5000',
                'produtor-elite-10000',
            ])
            ->update(['recursos' => json_encode($eliteRecursos)]);
    }

    public function down(): void
    {
        // sem rollback — recursos não são dados críticos
    }
};
