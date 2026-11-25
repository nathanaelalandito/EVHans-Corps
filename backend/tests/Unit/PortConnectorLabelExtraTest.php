<?php
namespace Tests\Unit;
use App\Models\Port;
use PHPUnit\Framework\TestCase;
class PortConnectorLabelExtraTest extends TestCase
{
    public function test_known(){ $p=new Port(['tipe_konektor'=>'ccs2']); $this->assertSame('CCS2',$p->connectorLabel()); }
    public function test_unknown(){ $p=new Port(['tipe_konektor'=>'xyz']); $this->assertSame('xyz',$p->connectorLabel()); }
}
