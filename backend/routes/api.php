<?php
use App\Http\Controllers\Api\ProfileDriverController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\DompetPinController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\TopupController;

Route::get('/user', function (Request $request) {
    return $request->user()->load('profile');
})->middleware('auth:sanctum');


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Kelola PIN dompet (semua butuh login via Sanctum)
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/', [DompetPinController::class, 'show']);
    Route::get('/transactions', [DompetPinController::class, 'transactions']);
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
});

Route::middleware('auth:sanctum')->prefix('topup')->group(function () {
    Route::get('/methods', [TopupController::class, 'methods']);
    Route::post('/', [TopupController::class, 'store']);
    Route::get('/{reference}', [TopupController::class, 'show']);
    Route::post('/{reference}/simulate-pay', [TopupController::class, 'simulatePay']);
});