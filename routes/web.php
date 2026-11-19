<?php

use Illuminate\Support\Facades\Route;

// SPA React: cualquier ruta web (que no sea /api) sirve la aplicación React
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
