<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Captura ajuste diário BGI às 19h (após B3 publicar ajustes ~18:30)
// e às 13h para capturar curPrc durante o pregão
Schedule::command('b3:capturar')->dailyAt('13:00');
Schedule::command('b3:capturar', ['--force'])->dailyAt('19:00');
