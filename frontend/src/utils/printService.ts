// frontend/src/utils/printService.ts
// ONLY THIS CODE - NO EXAMPLES, NO IMPORTS, NO REACT COMPONENTS

interface PrintReceipt {
  order_id: number;
  business_name: string;
  business_address: string;
  business_phone: string;
  cashier: string;
  table?: string;
  subtotal_amount?: number;
  qqs_percent?: number;
  qqs_amount?: number;
  fee_percent?: number;
  fee_amount?: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
}

class PrintService {
  private agentUrl = "http://127.0.0.1:9100";
  private isAgentAvailable: boolean | null = null;

  private async fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async checkAgentStatus(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.agentUrl}/status`, {
        method: "GET",
      }, 5000);
      this.isAgentAvailable = response.ok;
      return response.ok;
    } catch (error) {
      console.error("PrintAgent status check failed", error);
      this.isAgentAvailable = false;
      return false;
    }
  }

  async printReceipt(receiptData: PrintReceipt): Promise<{
    status: string;
    message: string;
  }> {
    try {
      if (this.isAgentAvailable === null) {
        await this.checkAgentStatus();
      }

      if (!this.isAgentAvailable) {
        return {
          status: "agent_unavailable",
          message: "PrintAgent not running.",
        };
      }

      const response = await this.fetchWithTimeout(`${this.agentUrl}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(receiptData),
      }, 5000);

      if (!response.ok) {
        throw new Error("Print request failed");
      }

      const result = await response.json();

      if (
        result.status === "printed" ||
        result.status === "printed_after_reconnect"
      ) {
        return {
          status: "success",
          message: `Receipt printed to ${result.printer}`,
        };
      } else if (result.status === "saved_to_file") {
        return {
          status: "saved",
          message: "Printer unavailable. Receipt saved to file.",
        };
      } else {
        return {
          status: "error",
          message: result.error || "Print failed",
        };
      }
    } catch (error) {
      console.error("Print error", error);
      this.isAgentAvailable = false;
      return {
        status: "error",
        message: "Could not connect to printer",
      };
    }
  }

  async testPrint(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.fetchWithTimeout(`${this.agentUrl}/test`, {
        method: "POST",
      }, 5000);

      if (!response.ok) {
        throw new Error("Test print failed");
      }

      const result = await response.json();
      return {
        status: result.status,
        message: `Test receipt printed to ${result.printer || "file"}`,
      };
    } catch {
      return {
        status: "error",
        message: "PrintAgent not running or printer not connected",
      };
    }
  }

  async reconnectPrinter(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.agentUrl}/reconnect`, {
        method: "POST",
      }, 5000);

      if (!response.ok) return false;

      const result = await response.json();
      this.isAgentAvailable = result.status === "connected";
      return this.isAgentAvailable;
    } catch {
      return false;
    }
  }
}

export const printService = new PrintService();
