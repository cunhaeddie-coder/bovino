<?php

namespace App\Services;

class FazendaContext
{
    protected static ?int $id = null;

    public static function set(int $id): void
    {
        static::$id = $id;
    }

    public static function id(): ?int
    {
        return static::$id;
    }

    public static function reset(): void
    {
        static::$id = null;
    }
}
