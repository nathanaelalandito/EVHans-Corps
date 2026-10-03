<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Payment;

class Refund extends Model {
    protected $table = 'refund';
    protected $primaryKey = 'id_refund';
    protected $fillable = ['id_payment', 'nominal', 'waktu_excute', 'status_refund'];

    public function payment(): BelongsTo {
        return $this->belongsTo(Payment::class, 'id_payment', 'id_payment');
    }
}