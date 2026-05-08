<?php

use App\Http\Controllers\Api\Admin\AdminAnuncianteController;
use App\Http\Controllers\Api\Admin\AdminBannerController;
use App\Http\Controllers\Api\Admin\AdminAnuncioController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminAvaliacaoController;
use App\Http\Controllers\Api\Admin\AdminCustoSaasController;
use App\Http\Controllers\Api\Admin\AdminEquipeController;
use App\Http\Controllers\Api\Admin\AdminFazendaController;
use App\Http\Controllers\Api\Admin\AdminFinanceiroController;
use App\Http\Controllers\Api\Admin\AdminIntelligenciaController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminUsuarioController;
use App\Http\Controllers\Api\Admin\AdminVisitaController;
use App\Http\Controllers\Api\Admin\AdminSugestaoController;
use Illuminate\Support\Facades\Route;

// Auth (público)
Route::post('login',  [AdminAuthController::class, 'login']);

// Protegido
Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AdminAuthController::class, 'logout']);
    Route::get('me',     [AdminAuthController::class, 'me']);

    // Stats / dashboard
    Route::get('stats/dashboard',        [AdminStatsController::class, 'dashboard']);
    Route::get('stats/crescimento',      [AdminStatsController::class, 'crescimento']);
    Route::get('stats/assinaturas-plano',[AdminStatsController::class, 'assinaturasPorPlano']);

    // Usuários
    Route::get('usuarios',                  [AdminUsuarioController::class, 'index']);
    Route::get('usuarios/{id}',             [AdminUsuarioController::class, 'show']);
    Route::post('usuarios/{id}/bloquear',      [AdminUsuarioController::class, 'bloquear']);
    Route::post('usuarios/{id}/desbloquear',  [AdminUsuarioController::class, 'desbloquear']);
    Route::delete('usuarios/{id}',             [AdminUsuarioController::class, 'desativar']);
    Route::post('usuarios/{id}/reativar',      [AdminUsuarioController::class, 'reativar']);
    Route::post('usuarios/{id}/simular-plano', [AdminUsuarioController::class, 'simularPlano']);

    // Anúncios
    Route::get('anuncios',                [AdminAnuncioController::class, 'index']);
    Route::post('anuncios/{id}/destacar', [AdminAnuncioController::class, 'destacar']);
    Route::delete('anuncios/{id}',        [AdminAnuncioController::class, 'remover']);
    Route::post('anuncios/{id}/restaurar',[AdminAnuncioController::class, 'restaurar']);

    // Anunciantes
    Route::get('anunciantes',                       [AdminAnuncianteController::class, 'index']);
    Route::post('anunciantes',                      [AdminAnuncianteController::class, 'store']);
    Route::get('anunciantes/{id}',                  [AdminAnuncianteController::class, 'show']);
    Route::put('anunciantes/{id}',                  [AdminAnuncianteController::class, 'update']);
    Route::post('anunciantes/{id}/suspender',       [AdminAnuncianteController::class, 'suspender']);
    Route::post('anunciantes/{id}/reativar',        [AdminAnuncianteController::class, 'reativar']);
    Route::post('anunciantes/{id}/resetar-senha',   [AdminAnuncianteController::class, 'resetarSenha']);

    // Financeiro
    Route::get('assinaturas',                       [AdminFinanceiroController::class, 'assinaturas']);
    Route::post('assinaturas/{id}/cancelar',        [AdminFinanceiroController::class, 'cancelarAssinatura']);
    Route::post('assinaturas/{id}/ativar',          [AdminFinanceiroController::class, 'ativarAssinatura']);
    Route::get('pagamentos',                        [AdminFinanceiroController::class, 'pagamentos']);

    // Fazendas
    Route::get('fazendas',                          [AdminFazendaController::class, 'index']);
    Route::get('fazendas/{id}',                     [AdminFazendaController::class, 'show']);
    Route::post('fazendas/{id}/toggle-ativo',       [AdminFazendaController::class, 'toggleAtivo']);

    // Visitas
    Route::get('visitas',                           [AdminVisitaController::class, 'index']);

    // Avaliações
    Route::get('avaliacoes',                        [AdminAvaliacaoController::class, 'index']);
    Route::delete('avaliacoes/{id}',                [AdminAvaliacaoController::class, 'destroy']);

    // Inteligência de mercado
    Route::get('inteligencia/resumo',               [AdminIntelligenciaController::class, 'resumo']);
    Route::get('inteligencia/buscas',               [AdminIntelligenciaController::class, 'buscas']);
    Route::get('inteligencia/transacoes',           [AdminIntelligenciaController::class, 'transacoes']);
    Route::get('inteligencia/alertas',              [AdminIntelligenciaController::class, 'alertas']);

    // Custos SaaS
    Route::get('custos',              [AdminCustoSaasController::class, 'index']);
    Route::get('custos/resumo',       [AdminCustoSaasController::class, 'resumo']);
    Route::post('custos',             [AdminCustoSaasController::class, 'store']);
    Route::put('custos/{id}',         [AdminCustoSaasController::class, 'update']);
    Route::delete('custos/{id}',      [AdminCustoSaasController::class, 'destroy']);

    // Banners B2B
    Route::get('banners',                      [AdminBannerController::class, 'index']);
    Route::get('banners/anunciantes',          [AdminBannerController::class, 'anunciantes']);
    Route::post('banners',                     [AdminBannerController::class, 'store']);
    Route::put('banners/{id}',                 [AdminBannerController::class, 'update']);
    Route::post('banners/{id}/toggle-ativo',   [AdminBannerController::class, 'toggleAtivo']);
    Route::delete('banners/{id}',              [AdminBannerController::class, 'destroy']);

    // Sugestões dos clientes
    Route::get('sugestoes',               [AdminSugestaoController::class, 'index']);
    Route::put('sugestoes/{id}/responder',[AdminSugestaoController::class, 'responder']);

    // Equipe (só super admins — validado no controller)
    Route::get('equipe',                            [AdminEquipeController::class, 'index']);
    Route::post('equipe',                           [AdminEquipeController::class, 'store']);
    Route::put('equipe/{id}',                       [AdminEquipeController::class, 'update']);
    Route::post('equipe/{id}/toggle-ativo',         [AdminEquipeController::class, 'toggleAtivo']);
});
