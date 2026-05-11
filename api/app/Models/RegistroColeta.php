<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class RegistroColeta extends Model
{
    use BelongsToFazenda;

    protected $table = 'registros_coleta';

    protected $fillable = ['template_id','fazenda_id','dados','animal_id','lote_id','pastagem_id','user_id','data_coleta'];
    protected $casts = ['dados' => 'array'];

    public function template(): BelongsTo { return $this->belongsTo(TemplateColeta::class); }
    public function animal(): BelongsTo { return $this->belongsTo(Rebanho::class, 'animal_id'); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
    public function pastagem(): BelongsTo { return $this->belongsTo(Pastagem::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
