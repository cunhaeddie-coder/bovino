<?php

use App\Http\Controllers\Api\AlertaDemandaController;
use App\Http\Controllers\Api\AnunciantePainelController;
use App\Http\Controllers\Api\AnuncioController;
use App\Http\Controllers\Api\AssinaturaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\CheckoutSimuladoController;
use App\Http\Controllers\Api\CotacaoController;
use App\Http\Controllers\Api\GestaoCurralController;
use App\Http\Controllers\Api\GestaoEventoCampoController;
use App\Http\Controllers\Api\GestaoFinanceiroController;
use App\Http\Controllers\Api\GestaoFinanceiroFazendaController;
use App\Http\Controllers\Api\GestaoFornecedorController;
use App\Http\Controllers\Api\GestaoFuncionarioController;
use App\Http\Controllers\Api\GestaoIAController;
use App\Http\Controllers\Api\GestaoReproducaoController;
use App\Http\Controllers\Api\GestaoInsumoController;
use App\Http\Controllers\Api\GestaoLoteController;
use App\Http\Controllers\Api\GestaoPastoController;
use App\Http\Controllers\Api\GestaoPesagemController;
use App\Http\Controllers\Api\GestaoRebanhoController;
use App\Http\Controllers\Api\GestaoSaudeController;
use App\Http\Controllers\Api\IntelligenciaController;
use App\Http\Controllers\Api\MidiaController;
use App\Http\Controllers\Api\NegociacaoController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\PlanoController;
use App\Http\Controllers\Api\FazendaController;
use App\Http\Controllers\Api\VisitaController;
use App\Http\Controllers\Api\GestaoSugestaoController;
use App\Http\Controllers\Api\ArrendamentoController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

// Só disponível em ambiente local
if (app()->environment('local')) {
    Route::get('dev/otp/{celular}', function (string $celular) {
        $otp = \App\Models\Otp::where('celular', preg_replace('/\D/', '', $celular))
            ->where('usado', false)
            ->where('expira_em', '>', now())
            ->latest('id')
            ->first();

        if (!$otp) {
            return response()->json(['message' => 'Nenhum OTP ativo para este celular.'], 404);
        }

        return response()->json([
            'celular' => $otp->celular,
            'codigo' => $otp->codigo,
            'finalidade' => $otp->finalidade,
            'expira_em' => $otp->expira_em,
        ]);
    });
}

// Webhooks fora do versionamento — URLs imutáveis registradas nos gateways
Route::post('webhook/mercadopago', [WebhookController::class, 'mercadopago']);
Route::post('webhook/stripe', [StripeWebhookController::class, 'handle']);

Route::prefix('v1')->group(function () {

// Público
Route::prefix('auth')->group(function () {
    Route::post('cadastro', [AuthController::class, 'cadastro']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('otp/enviar', [AuthController::class, 'enviarOtp']);
    Route::post('otp/verificar', [AuthController::class, 'verificarOtp']);
    Route::post('login-otp', [AuthController::class, 'loginComOtp']);
    Route::get('google', [GoogleAuthController::class, 'redirect']);
    Route::get('google/callback', [GoogleAuthController::class, 'callback']);
});

// Anunciante — autenticação separada (guard anunciante via sanctum)
Route::prefix('anunciante')->group(function () {
    Route::post('cadastro', [AnunciantePainelController::class, 'cadastro']);
    Route::post('login', [AnunciantePainelController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AnunciantePainelController::class, 'me']);
        Route::put('perfil', [AnunciantePainelController::class, 'atualizarPerfil']);
        Route::post('logout', [AnunciantePainelController::class, 'logout']);

        Route::get('banners', [AnunciantePainelController::class, 'banners']);
        Route::post('banners', [AnunciantePainelController::class, 'criarBanner']);
        Route::put('banners/{banner}', [AnunciantePainelController::class, 'atualizarBanner']);
        Route::delete('banners/{banner}', [AnunciantePainelController::class, 'excluirBanner']);

        Route::get('estatisticas', [AnunciantePainelController::class, 'estatisticas']);

        // Assinatura do anunciante
        Route::get('assinatura', [AssinaturaController::class, 'minhaAssinatura']);
        Route::post('assinar', [AssinaturaController::class, 'assinar']);
        Route::delete('assinatura', [AssinaturaController::class, 'cancelar']);
    });
});

// Planos (público)
Route::get('planos', [PlanoController::class, 'index']);
Route::get('planos/{slug}', [PlanoController::class, 'show']);

Route::get('anuncios', [AnuncioController::class, 'index']);
Route::get('anuncios/{anuncio}', [AnuncioController::class, 'show']);
Route::get('usuarios/{id}/perfil', [PerfilController::class, 'publico']);

Route::get('cotacoes', [CotacaoController::class, 'index']);
Route::get('cotacoes/ultima', [CotacaoController::class, 'ultima']);

Route::get('fazendas/{slug}', [FazendaController::class, 'showBySlug']);

// Inteligência de mercado (público — log de buscas e cotações realizadas)
Route::post('inteligencia/busca', [IntelligenciaController::class, 'logBusca']);
Route::get('inteligencia/cotacoes', [IntelligenciaController::class, 'cotacoesRealizadas']);
Route::get('inteligencia/demanda', [IntelligenciaController::class, 'demandaRegioes']);
Route::get('inteligencia/oferta-regioes', [IntelligenciaController::class, 'ofertaRegioes']);
Route::get('inteligencia/oportunidades', [IntelligenciaController::class, 'oportunidades']);

Route::get('banners', [BannerController::class, 'porPosicao']);
Route::post('banners/{banner}/impressao', [BannerController::class, 'registrarImpressao']);
Route::post('banners/{banner}/clique', [BannerController::class, 'registrarClique']);

// Autenticado (usuários: compradores e produtores)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refreshToken']);
    });

    Route::prefix('perfil')->group(function () {
        Route::get('/', [PerfilController::class, 'show']);
        Route::put('/', [PerfilController::class, 'update']);
        Route::put('senha', [PerfilController::class, 'alterarSenha']);
    });

    // Assinatura do usuário
    Route::get('assinatura', [AssinaturaController::class, 'minhaAssinatura']);
    Route::post('assinar', [AssinaturaController::class, 'assinar']);
    Route::post('pagamento/pix', [AssinaturaController::class, 'pagarPix']);
    Route::post('pagamento/stripe', [AssinaturaController::class, 'pagarStripe']);
    Route::delete('assinatura', [AssinaturaController::class, 'cancelar']);

    // Checkout simulado (pagamento fictício para testes)
    Route::post('checkout/simular/iniciar',         [CheckoutSimuladoController::class, 'iniciar']);
    Route::post('checkout/simular/{id}/confirmar',  [CheckoutSimuladoController::class, 'confirmar']);

    Route::get('anuncios/meus', [AnuncioController::class, 'meus']);
    Route::post('anuncios', [AnuncioController::class, 'store']);
    Route::put('anuncios/{anuncio}', [AnuncioController::class, 'update']);
    Route::delete('anuncios/{anuncio}', [AnuncioController::class, 'destroy']);

    Route::post('anuncios/{anuncio}/midias', [MidiaController::class, 'upload']);
    Route::delete('midias/{midia}', [MidiaController::class, 'destroy']);

    Route::get('negociacoes', [NegociacaoController::class, 'index']);
    Route::post('negociacoes', [NegociacaoController::class, 'store']);
    Route::get('negociacoes/{negociacao}', [NegociacaoController::class, 'show']);
    Route::put('negociacoes/{negociacao}/status', [NegociacaoController::class, 'atualizarStatus']);
    Route::get('negociacoes/{negociacao}/mensagens', [NegociacaoController::class, 'mensagens']);
    Route::post('negociacoes/{negociacao}/mensagens', [NegociacaoController::class, 'enviarMensagem']);

    // Fazenda / perfil da propriedade
    Route::get('fazenda/minha', [FazendaController::class, 'show']);
    Route::post('fazenda', [FazendaController::class, 'store']);
    Route::put('fazenda', [FazendaController::class, 'update']);

    // Visitas (marketplace — não precisa de fazenda.context)
    Route::get('visitas', [VisitaController::class, 'minhas']);
    Route::post('anuncios/{anuncioId}/visita', [VisitaController::class, 'solicitar']);
    Route::put('visitas/{id}/responder', [VisitaController::class, 'responder']);
    Route::put('visitas/{id}/cancelar', [VisitaController::class, 'cancelar']);

    // Alertas de demanda (marketplace)
    Route::get('alertas-demanda', [AlertaDemandaController::class, 'index']);
    Route::post('alertas-demanda', [AlertaDemandaController::class, 'store']);
    Route::put('alertas-demanda/{id}', [AlertaDemandaController::class, 'update']);
    Route::delete('alertas-demanda/{id}', [AlertaDemandaController::class, 'destroy']);

    // Inteligência — match de lotes com demanda (marketplace)
    Route::get('inteligencia/match-lotes', [IntelligenciaController::class, 'alertasMatchLotes']);

    // Sugestões de melhoria (não requer fazenda)
    Route::prefix('gestao/sugestoes')->group(function () {
        Route::get('/',        [GestaoSugestaoController::class, 'index']);
        Route::post('/',       [GestaoSugestaoController::class, 'store']);
        Route::delete('/{id}', [GestaoSugestaoController::class, 'destroy']);
    });

    // ── Gestão pecuária (requer fazenda configurada) ──────────────
    Route::middleware('fazenda.context')->group(function () {

    // Gestão pecuária — rebanho
    Route::prefix('gestao/rebanho')->group(function () {
        Route::get('/', [GestaoRebanhoController::class, 'index']);
        Route::post('/', [GestaoRebanhoController::class, 'store']);
        Route::post('/grupo', [GestaoRebanhoController::class, 'storeGrupo']);
        Route::get('/resumo', [GestaoRebanhoController::class, 'resumo']);
        Route::get('/dashboard', [GestaoRebanhoController::class, 'dashboard']);
        Route::get('/{id}', [GestaoRebanhoController::class, 'show']);
        Route::put('/{id}', [GestaoRebanhoController::class, 'update']);
        Route::delete('/{id}', [GestaoRebanhoController::class, 'destroy']);
    });

    // Gestão pecuária — lotes
    Route::prefix('gestao/lotes')->group(function () {
        Route::get('/', [GestaoLoteController::class, 'index']);
        Route::post('/', [GestaoLoteController::class, 'store']);
        Route::get('/{id}', [GestaoLoteController::class, 'show']);
        Route::put('/{id}', [GestaoLoteController::class, 'update']);
        Route::delete('/{id}', [GestaoLoteController::class, 'destroy']);
        Route::get('/{id}/publicar', [GestaoLoteController::class, 'publicar']);
    });

    // Gestão pecuária — saúde
    Route::prefix('gestao/saude')->group(function () {
        Route::get('/', [GestaoSaudeController::class, 'index']);
        Route::post('/', [GestaoSaudeController::class, 'store']);
        Route::put('/{id}', [GestaoSaudeController::class, 'update']);
        Route::delete('/{id}', [GestaoSaudeController::class, 'destroy']);
        Route::get('/alertas', [GestaoSaudeController::class, 'alertas']);
    });

    // Gestão pecuária — pesagens
    Route::prefix('gestao/pesagens')->group(function () {
        Route::get('/', [GestaoPesagemController::class, 'index']);
        Route::post('/', [GestaoPesagemController::class, 'store']);
        Route::delete('/{id}', [GestaoPesagemController::class, 'destroy']);
        Route::get('/evolucao/{animalId}', [GestaoPesagemController::class, 'evolucao']);
    });

    // Gestão pecuária — financeiro
    Route::prefix('gestao/financeiro')->group(function () {
        Route::get('/', [GestaoFinanceiroController::class, 'index']);
        Route::post('/', [GestaoFinanceiroController::class, 'store']);
        Route::delete('/{id}', [GestaoFinanceiroController::class, 'destroy']);
        Route::get('/resumo', [GestaoFinanceiroController::class, 'resumo']);
    });


    // Gestão — fornecedores
    Route::prefix('gestao/fornecedores')->group(function () {
        Route::get('/', [GestaoFornecedorController::class, 'index']);
        Route::post('/', [GestaoFornecedorController::class, 'store']);
        Route::put('/{id}', [GestaoFornecedorController::class, 'update']);
        Route::delete('/{id}', [GestaoFornecedorController::class, 'destroy']);
    });

    // Gestão — insumos e estoque
    Route::prefix('gestao/insumos')->group(function () {
        Route::get('/', [GestaoInsumoController::class, 'indexInsumos']);
        Route::post('/', [GestaoInsumoController::class, 'storeInsumo']);
        Route::put('/{id}', [GestaoInsumoController::class, 'updateInsumo']);
        Route::get('/estoque/resumo', [GestaoInsumoController::class, 'resumoEstoque']);
        Route::post('/{id}/movimentar', [GestaoInsumoController::class, 'movimentar']);
    });

    // Gestão — compras de insumos
    Route::prefix('gestao/compras')->group(function () {
        Route::get('/', [GestaoInsumoController::class, 'indexCompras']);
        Route::post('/', [GestaoInsumoController::class, 'storeCompra']);
    });

    // Gestão — funcionários e prestadores
    Route::prefix('gestao/funcionarios')->group(function () {
        Route::get('/', [GestaoFuncionarioController::class, 'indexFuncionarios']);
        Route::post('/', [GestaoFuncionarioController::class, 'storeFuncionario']);
        Route::put('/{id}', [GestaoFuncionarioController::class, 'updateFuncionario']);
        Route::post('/{id}/desligar', [GestaoFuncionarioController::class, 'desligarFuncionario']);
        Route::post('/{id}/ativar-app', [GestaoFuncionarioController::class, 'ativarApp']);
        Route::post('/{id}/reenviar-codigo', [GestaoFuncionarioController::class, 'reenviarCodigo']);
        Route::post('/{id}/revogar-app', [GestaoFuncionarioController::class, 'revogarApp']);
    });

    Route::prefix('gestao/prestadores')->group(function () {
        Route::get('/', [GestaoFuncionarioController::class, 'indexPrestadores']);
        Route::post('/', [GestaoFuncionarioController::class, 'storePrestador']);
        Route::put('/{id}', [GestaoFuncionarioController::class, 'updatePrestador']);
    });

    // Gestão — tarefas
    Route::prefix('gestao/tarefas')->group(function () {
        Route::get('/', [GestaoFuncionarioController::class, 'indexTarefas']);
        Route::post('/', [GestaoFuncionarioController::class, 'storeTarefa']);
        Route::put('/{id}', [GestaoFuncionarioController::class, 'updateTarefa']);
        Route::delete('/{id}', [GestaoFuncionarioController::class, 'destroyTarefa']);
    });

    // Gestão — eventos de campo (vaqueiro report)
    Route::prefix('gestao/eventos')->group(function () {
        Route::get('/', [GestaoEventoCampoController::class, 'index']);
        Route::post('/', [GestaoEventoCampoController::class, 'store']);
        Route::post('/{id}/resolver', [GestaoEventoCampoController::class, 'resolver']);
        Route::delete('/{id}', [GestaoEventoCampoController::class, 'destroy']);
    });

    // Gestão — financeiro completo (receitas, contas)
    Route::prefix('gestao/financeiro2')->group(function () {
        Route::get('/resumo', [GestaoFinanceiroFazendaController::class, 'resumo']);
        Route::get('/receitas', [GestaoFinanceiroFazendaController::class, 'indexReceitas']);
        Route::post('/receitas', [GestaoFinanceiroFazendaController::class, 'storeReceita']);
        Route::delete('/receitas/{id}', [GestaoFinanceiroFazendaController::class, 'destroyReceita']);
        Route::get('/contas-pagar', [GestaoFinanceiroFazendaController::class, 'indexContasPagar']);
        Route::post('/contas-pagar', [GestaoFinanceiroFazendaController::class, 'storeContaPagar']);
        Route::post('/contas-pagar/{id}/pagar', [GestaoFinanceiroFazendaController::class, 'pagarConta']);
        Route::delete('/contas-pagar/{id}', [GestaoFinanceiroFazendaController::class, 'destroyContaPagar']);
        Route::get('/contas-receber', [GestaoFinanceiroFazendaController::class, 'indexContasReceber']);
        Route::post('/contas-receber', [GestaoFinanceiroFazendaController::class, 'storeContaReceber']);
        Route::post('/contas-receber/{id}/receber', [GestaoFinanceiroFazendaController::class, 'receberConta']);
    });

    // Gestão — pasto (mapa, trocas, nutrição, coletas)
    Route::prefix('gestao/pasto')->group(function () {
        Route::get('/mapa', [GestaoPastoController::class, 'mapaPastagens']);
        Route::post('/pastagens', [GestaoPastoController::class, 'storePastagem']);
        Route::put('/pastagens/{id}', [GestaoPastoController::class, 'updatePastagem']);
        Route::delete('/pastagens/{id}', [GestaoPastoController::class, 'destroyPastagem']);
        Route::get('/trocas', [GestaoPastoController::class, 'indexTrocas']);
        Route::post('/trocas', [GestaoPastoController::class, 'storeTroca']);
        Route::get('/aplicacoes', [GestaoPastoController::class, 'indexAplicacoes']);
        Route::post('/aplicacoes', [GestaoPastoController::class, 'storeAplicacao']);
        Route::get('/templates', [GestaoPastoController::class, 'indexTemplates']);
        Route::post('/templates', [GestaoPastoController::class, 'storeTemplate']);
        Route::get('/templates/{id}/registros', [GestaoPastoController::class, 'indexRegistros']);
        Route::post('/templates/{id}/registros', [GestaoPastoController::class, 'storeRegistro']);
    });

    // App Curral — dentro do fazenda.context para gestores

    // Módulo Reprodutivo
    Route::prefix('gestao/reproducao')->group(function () {
        Route::get('/dashboard',      [GestaoReproducaoController::class, 'dashboard']);
        Route::get('/proximos-partos',[GestaoReproducaoController::class, 'proximosPartos']);
        Route::get('/',               [GestaoReproducaoController::class, 'index']);
        Route::post('/',              [GestaoReproducaoController::class, 'store']);
        Route::delete('/{id}',        [GestaoReproducaoController::class, 'destroy']);
    });

    // App Gestor — IA e valor do rebanho
    Route::prefix('gestao/ia')->group(function () {
        Route::post('/chat', [GestaoIAController::class, 'chat']);
        Route::get('/historico', [GestaoIAController::class, 'historico']);
        Route::get('/valor-rebanho', [GestaoIAController::class, 'valorRebanho']);
    });

    // Ordens de Serviço
    Route::prefix('gestao/ordens')->group(function () {
        Route::get('/estatisticas', [OrdemServicoController::class, 'estatisticas']);
        Route::get('/', [OrdemServicoController::class, 'index']);
        Route::post('/', [OrdemServicoController::class, 'store']);
        Route::get('/{id}', [OrdemServicoController::class, 'show']);
        Route::put('/{id}', [OrdemServicoController::class, 'update']);
        Route::delete('/{id}', [OrdemServicoController::class, 'destroy']);
        Route::post('/{id}/publicar', [OrdemServicoController::class, 'publicar']);
        Route::post('/{id}/executar', [OrdemServicoController::class, 'executar']);
        Route::put('/{osId}/animais/{animalId}', [OrdemServicoController::class, 'atualizarAnimal']);
    });

    // Arrendamentos (tomador e cedente)
    Route::prefix('gestao/arrendamentos')->group(function () {
        Route::get('/', [ArrendamentoController::class, 'index']);
        Route::post('/', [ArrendamentoController::class, 'store']);
        Route::put('/{arrendamento}', [ArrendamentoController::class, 'update']);
        Route::delete('/{arrendamento}', [ArrendamentoController::class, 'destroy']);
    });

    }); // fazenda.context

    // Vaqueiro + Gestor — sem fazenda.context (controller resolve a fazenda internamente)
    Route::prefix('gestao/curral')->group(function () {
        Route::get('/dados-offline', [GestaoCurralController::class, 'dadosOffline']);
        Route::get('/sessoes', [GestaoCurralController::class, 'indexSessoes']);
        Route::post('/sessoes', [GestaoCurralController::class, 'iniciarSessao']);
        Route::post('/sessoes/{id}/sincronizar', [GestaoCurralController::class, 'sincronizar']);
        Route::post('/sincronizar', [GestaoCurralController::class, 'sincronizarDireto']);
    });

    Route::get('minhas-ordens', [OrdemServicoController::class, 'minhasOrdens']);
    Route::put('minhas-ordens/{osId}/animais/{animalId}', [OrdemServicoController::class, 'vaqueirAtualizarAnimal']);

}); // auth:sanctum

}); // v1
