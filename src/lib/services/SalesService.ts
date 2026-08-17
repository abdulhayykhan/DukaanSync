import { SaleTransactionService, type SaleTransactionData, type SaleImportPayload } from "@/lib/sales/transaction";

export class SalesService {
  /**
   * Alias for executeSaleTransaction to ensure full compatibility.
   */
  static async createSaleTransaction(
    businessId: string,
    shopId: string,
    userId: string,
    data: SaleTransactionData
  ): Promise<{ saleId: string; invoiceNumber: string }> {
    return SaleTransactionService.executeSaleTransaction(businessId, shopId, userId, data);
  }

  static async executeSaleTransaction(
    businessId: string,
    shopId: string,
    userId: string,
    data: SaleTransactionData
  ): Promise<{ saleId: string; invoiceNumber: string }> {
    return SaleTransactionService.executeSaleTransaction(businessId, shopId, userId, data);
  }

  static async getRecentSales(businessId: string, shopId: string, maxResults = 500) {
    return SaleTransactionService.getRecentSales(businessId, shopId, maxResults);
  }

  static async bulkImportSales(
    businessId: string,
    shopId: string,
    userId: string,
    sales: SaleImportPayload[],
    duplicateStrategy: any = "upsert",
    onProgress?: (processed: number, total: number) => void
  ) {
    return SaleTransactionService.bulkImportSales(businessId, shopId, userId, sales, duplicateStrategy, onProgress);
  }
}
