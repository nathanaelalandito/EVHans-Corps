<?php
use App\Http\Controllers\Api\ProfileDriverController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\DompetPinController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\OperatorController;
use Symfony\Component\Routing\Annotation\Route as AnnotationRoute;

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

Route::middleware('auth:sanctum')->group(function(){
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/operator/dashboard', [OperatorController::class, 'getDashboard']);
        Route::get('/operator/chargers', [OperatorController::class, 'getChargers']);
        Route::post('/operator/storechargers', [OperatorController::class, 'storeCharger']);
        Route::put('/operator/chargers/{id}', [OperatorController::class, 'updateCharger']);
        Route::post('/operator/charger/{id}/start', [OperatorController::class, 'startCharger']);
        Route::post('/operator/charger/{id}/stop', [OperatorController::class, 'stopCharger']);
        Route::post('/operator/charger/{id}/reboot', [OperatorController::class, 'rebootCharger']);
        Route::delete('/operator/delchargers/{id}', [OperatorController::class, 'destroyCharger']);
        Route::get('/operator/ports', [OperatorController::class, 'getPorts']);
        Route::post('/operator/storeports', [OperatorController::class, 'storePort']);
        Route::put('/operator/ports/{id}', [OperatorController::class, 'updatePort']);
        Route::post('/operator/port/{id}/start', [OperatorController::class, 'startport']);
        Route::post('/operator/port/{id}/stop', [OperatorController::class, 'stoport']);
        Route::post('/operator/port/{id}/reboot', [OperatorController::class, 'rebootport']);
        Route::delete('/operator/delports/{id}', [OperatorController::class, 'destroyPort']);
        Route::get('/operator/reports', [OperatorController::class, 'getOperationalReports']);
        Route::get('/operator/profile', [OperatorController::class, 'getProfile']);
    });
});