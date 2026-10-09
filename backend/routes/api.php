<?php

use App\Http\Controllers\Api\ChargingSessionController;
use App\Http\Controllers\Api\DompetPinController;
use App\Http\Controllers\Api\OperationsController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProfileDriverController;
use App\Http\Controllers\Api\StationController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user()->load('profile');
})->middleware('auth:sanctum');

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Kelola PIN dompet (semua butuh login via Sanctum)
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/', [DompetPinController::class, 'show']);
    Route::post('/topup', [DompetPinController::class, 'topUp']);
    Route::post('/pin', [DompetPinController::class, 'setPin']);
    Route::put('/pin', [DompetPinController::class, 'changePin']);
    Route::post('/pin/verify', [DompetPinController::class, 'verifyPin']);
    Route::post('/pin/reset', [DompetPinController::class, 'resetPin']);
    Route::delete('/pin', [DompetPinController::class, 'disablePin']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/driver/profile', [ProfileDriverController::class, 'show']);
    Route::put('/driver/profile', [ProfileDriverController::class, 'update']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::post('/vehicles', [VehicleController::class, 'store']);
    Route::put('/vehicles/{id}', [VehicleController::class, 'update']);
    Route::delete('/vehicles/{id}', [VehicleController::class, 'destroy']);
    Route::get('/stations', [StationController::class, 'index']);
    Route::get('/payments/history', [PaymentController::class, 'history']);
    Route::get('/payments/{payment}', [PaymentController::class, 'show']);
    Route::get('/operations/dashboard', [OperationsController::class, 'dashboard']);
    Route::post('/operations/stations', [OperationsController::class, 'createStation']);
    Route::put('/operations/stations/{station}', [OperationsController::class, 'updateStation']);
    Route::put('/operations/chargers/{charger}', [OperationsController::class, 'updateCharger']);
    Route::post('/operations/stations/{station}/tarifs', [OperationsController::class, 'updateTarif']);
    Route::post('/operations/operators', [OperationsController::class, 'createOperator']);
    Route::get('/charging-sessions/history', [ChargingSessionController::class, 'history']);
    Route::get('/charging-sessions/active', [ChargingSessionController::class, 'active']);
    Route::post('/charging-sessions/validate', [ChargingSessionController::class, 'validateCharger']);
    Route::post('/charging-sessions/start', [ChargingSessionController::class, 'start']);
    Route::get('/charging-sessions/{session}/invoice', [ChargingSessionController::class, 'invoice']);
    Route::post('/charging-sessions/{session}/interrupt', [ChargingSessionController::class, 'interrupt']);
    Route::post('/charging-sessions/{session}/finish', [ChargingSessionController::class, 'finish']);
});