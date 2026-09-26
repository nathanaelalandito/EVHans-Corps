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

        $profile->update($request->validated());

        return new ProfileDriverResource($user->fresh('profile'));
    }
}