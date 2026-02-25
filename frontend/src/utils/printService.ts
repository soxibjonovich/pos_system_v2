// frontend/src/utils/printService.ts

interface PrintReceipt {
  order_id: number
  business_name: string
  business_address: string
  business_phone: string
  cashier: string
  table?: string
  items: Array<{
    name: string
    quantity: number
    price: number
    subtotal: number
  }>
  total: number
}

class PrintService {
  private agentUrl = 'http://localhost:9100'
  private isAgentAvailable: boolean | null = null

  /**
   * Check if PrintAgent is running on this PC
   */
  async checkAgentStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.agentUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      })
      this.isAgentAvailable = response.ok
      return response.ok
    } catch (error) {
      this.isAgentAvailable = false
      return false
    }
  }

  /**
   * Print receipt to local thermal printer
   */
  async printReceipt(receiptData: PrintReceipt): Promise<{
    status: string
    message: string
  }> {
    try {
      // Check if agent is available first
      if (this.isAgentAvailable === null) {
        await this.checkAgentStatus()
      }

      if (!this.isAgentAvailable) {
        return {
          status: 'agent_unavailable',
          message: 'PrintAgent not running. Receipt saved on server.',
        }
      }

      // Send print job to local agent
      const response = await fetch(`${this.agentUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (!response.ok) {
        throw new Error('Print request failed')
      }

      const result = await response.json()

      if (result.status === 'printed' || result.status === 'printed_after_reconnect') {
        return {
          status: 'success',
          message: `Receipt printed to ${result.printer}`,
        }
      } else if (result.status === 'saved_to_file') {
        return {
          status: 'saved',
          message: 'Printer unavailable. Receipt saved to file.',
        }
      } else {
        return {
          status: 'error',
          message: result.error || 'Print failed',
        }
      }
    } catch (error) {
      console.error('Print error:', error)
      this.isAgentAvailable = false
      return {
        status: 'error',
        message: 'Could not connect to printer',
      }
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.agentUrl}/test`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error('Test print failed')
      }

      const result = await response.json()
      return {
        status: result.status,
        message: `Test receipt printed to ${result.printer || 'file'}`,
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'PrintAgent not running or printer not connected',
      }
    }
  }

  /**
   * Force reconnect printer
   */
  async reconnectPrinter(): Promise<boolean> {
    try {
      const response = await fetch(`${this.agentUrl}/reconnect`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
      })

      if (!response.ok) return false

      const result = await response.json()
      this.isAgentAvailable = result.status === 'connected'
      return this.isAgentAvailable
    } catch (error) {
      return false
    }
  }
}

export const printService = new PrintService()


// Example usage in order creation:

// frontend/src/routes/staff/index.tsx

import { printService } from '@/utils/printService'

async function submitOrder(orderData: OrderData) {
  try {
    // 1. Create order on server
    const response = await fetch(`${api.orders.base}/${api.orders.orders}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) throw new Error('Failed to create order')

    const createdOrder = await response.json()

    // 2. Auto-print receipt to LOCAL printer
    const printReceipt = {
      order_id: createdOrder.id,
      business_name: 'My Restaurant', // Get from settings
      business_address: '123 Main St',
      business_phone: '+998 90 123 4567',
      cashier: user?.full_name || 'Staff',
      table: selectedTable?.number,
      items: orderData.items.map(item => ({
        name: item.product.title,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: item.quantity * item.product.price,
      })),
      total: createdOrder.total,
    }

    // Print silently in background (non-blocking)
    printService.printReceipt(printReceipt).then(result => {
      if (result.status === 'success') {
        console.log('✅ Receipt printed')
      } else if (result.status === 'agent_unavailable') {
        // Show non-intrusive notification
        console.warn('⚠️ PrintAgent not running')
      }
    })

    // 3. Show success to user (don't wait for print)
    toast.success('Order created!')
    resetCart()

  } catch (error) {
    toast.error('Failed to create order')
  }
}


// Admin settings page - Test printer button:

// frontend/src/routes/admin/settings/index.tsx

import { printService } from '@/utils/printService'

function SettingsPage() {
  const [printerStatus, setPrinterStatus] = useState<string>('checking')

  useEffect(() => {
    checkPrinterStatus()
  }, [])

  async function checkPrinterStatus() {
    const isAvailable = await printService.checkAgentStatus()
    setPrinterStatus(isAvailable ? 'connected' : 'disconnected')
  }

  async function handleTestPrint() {
    const result = await printService.testPrint()
    if (result.status === 'success' || result.status.includes('printed')) {
      toast.success('Test receipt printed!')
    } else {
      toast.error(result.message)
    }
  }

  async function handleReconnect() {
    const success = await printService.reconnectPrinter()
    if (success) {
      setPrinterStatus('connected')
      toast.success('Printer reconnected!')
    } else {
      toast.error('Failed to reconnect')
    }
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Printer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span>Printer Status:</span>
            <span className={`font-bold ${printerStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
              {printerStatus === 'connected' ? '✅ Connected' : '❌ Not Connected'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleTestPrint}>
              Test Print
            </Button>
            <Button onClick={handleReconnect} variant="outline">
              Reconnect
            </Button>
            <Button onClick={checkPrinterStatus} variant="outline">
              Check Status
            </Button>
          </div>

          {/* Instructions */}
          {printerStatus === 'disconnected' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm">
                <strong>PrintAgent not detected.</strong><br/>
                Make sure PrintAgent.exe is running on this PC and a USB printer is connected.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}