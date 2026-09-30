<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileDriverRequest;
use App\Http\Resources\ProfileDriverResource;
use Illuminate\Http\Request;

class ProfileDriverController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load('profile');
        return new ProfileDriverResource($user);
    }

    public function update(UpdateProfileDriverRequest $request)
    {
    $user = $request->user();
    $profile = $user->profile;
    $validated = $request->validated();

    // Pisahkan email (kolom di tabel users) dari field profil lainnya
    if (array_key_exists('email', $validated)) {
        $newEmail = $validated['email'];
        if ($newEmail !== $user->email) {
            $user->email = $newEmail;
             $user->email_verified_at = now(); // ✅ langsung dianggap terverifikasi
            $user->save();
        }
        unset($validated['email']);
    }
    $profile->update($validated);   // ⬅️ diganti dari $request->validated()
    return new ProfileDriverResource($user->fresh('profile'));
    }
}