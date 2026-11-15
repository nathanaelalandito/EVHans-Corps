<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAccountActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user() ?? auth('sanctum')->user();

        if ($user && $user->status_akun !== 'Aktif') {
            return response()->json(['message' => 'Akun tidak aktif.'], 403);
        }

        return $next($request);
    }
}
