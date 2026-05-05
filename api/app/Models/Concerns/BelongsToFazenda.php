<?php

namespace App\Models\Concerns;

use App\Services\FazendaContext;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToFazenda
{
    protected static function bootBelongsToFazenda(): void
    {
        static::addGlobalScope('fazenda', function (Builder $query) {
            if ($id = FazendaContext::id()) {
                $query->where(
                    (new static)->getTable() . '.fazenda_id',
                    $id
                );
            }
        });

        static::creating(function ($model) {
            if (!$model->fazenda_id && $id = FazendaContext::id()) {
                $model->fazenda_id = $id;
            }
        });
    }

    public function scopeParaFazenda(Builder $query, int $fazendaId): Builder
    {
        return $query->withoutGlobalScope('fazenda')
                     ->where($this->getTable() . '.fazenda_id', $fazendaId);
    }
}
