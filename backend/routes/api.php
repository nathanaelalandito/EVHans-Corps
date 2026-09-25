<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\DompetPinController;

Route::get('/user', function (Request $request) {
    return $request->user()->load('profile');
})->middleware('auth:sanctum');


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Kelola PIN dompet (semua butuh login via Sanctum)
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/', [DompetPinController::class, 'show']);
    Route::post('/pin', [DompetPinController::class, 'setPin']);
    Route::put('/pin', [DompetPinController::class, 'changePin']);
    Route::post('/pin/verify', [DompetPinController::class, 'verifyPin']);
    Route::post('/pin/reset', [DompetPinController::class, 'resetPin']);
    Route::delete('/pin', [DompetPinController::class, 'disablePin']);
});
