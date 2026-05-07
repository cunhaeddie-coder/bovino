<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class EventoCampo extends Model
{
    use BelongsToFazenda;

    protected $table = 'eventos_campo';

    protected $fillable = ['fazenda_id','tipo','descricao','animal_id','lote_id','pastagem_id','latitude','longitude','foto_url','reportado_por','data_evento','urgencia','resolvido','resolucao','coletado_em'];

    protected $casts = ['data_evento' => 'datetime', 'resolvido' => 'boolean'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function animal(): BelongsTo { return $this->belongsTo(Rebanho::class, 'animal_id'); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
    public function pastagem(): BelongsTo { return $this->belongsTo(Pastagem::class); }
    public function reportador(): BelongsTo { return $this->belongsTo(User::class, 'reportado_por'); }
}
