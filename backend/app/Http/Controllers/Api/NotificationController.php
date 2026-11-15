<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notifikasi::where('id_user', $request->user()->id_user)
            ->latest('created_at')
            ->paginate(20);

        return response()->json(['data' => $notifications]);
    }

    public function unreadCount(Request $request)
    {
        $count = Notifikasi::where('id_user', $request->user()->id_user)
            ->whereNull('dibaca_pada')
            ->count();

        return response()->json(['data' => ['unread' => $count]]);
    }

    public function markRead(Request $request, Notifikasi $notification)
    {
        if ($notification->id_user !== $request->user()->id_user) {
            abort(404);
        }

        $notification->update(['dibaca_pada' => now()]);

        return response()->json(['data' => $notification->fresh()]);
    }

    public function markAllRead(Request $request)
    {
        Notifikasi::where('id_user', $request->user()->id_user)
            ->whereNull('dibaca_pada')
            ->update(['dibaca_pada' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai dibaca.']);
    }
}
