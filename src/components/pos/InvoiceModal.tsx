import * as Dialog from "@radix-ui/react-dialog";
import { X, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/currency";
import type { Sale, Business } from "@/types";
import { useShop } from "@/contexts/ShopContext";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  business: Business | null;
}

export function InvoiceModal({ isOpen, onClose, sale, business }: InvoiceModalProps) {
  const { activeShop } = useShop();

  const handlePrint = () => {
    window.print();
  };

  if (!sale) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* The overlay is hidden during print */}
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in print:hidden" />
        
        {/* 
          Standard modal styling for screen, but for print, we remove absolute positioning, 
          shadows, and constraints so it prints cleanly as a receipt.
        */}
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-sm bg-white rounded-xl shadow-xl z-50 p-6 focus:outline-none animate-in zoom-in-95 
                     print:relative print:translate-x-0 print:translate-y-0 print:left-0 print:top-0 print:w-[80mm] print:shadow-none print:p-0 print:m-0"
        >
          {/* Header controls (Hidden on print) */}
          <div className="flex justify-between items-center mb-6 print:hidden">
            <div className="flex items-center text-green-600 font-bold">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Sale Completed
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Printable Receipt Area */}
          <div className="font-mono text-sm text-gray-900 print:text-black bg-white print:bg-transparent" id="printable-receipt">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold uppercase">{business?.name || "Business"}</h2>
              {activeShop?.name && <p className="text-sm font-semibold">{activeShop.name}</p>}
              {activeShop?.address && <p className="text-xs mt-1">{activeShop.address}</p>}
              {activeShop?.phone && <p className="text-xs">Tel: {activeShop.phone}</p>}
            </div>

            <div className="border-t border-b border-dashed border-gray-300 py-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(sale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>User</span> {/* Future: pass user name */}
              </div>
              {sale.customerName && (
                <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
                  <span>Customer:</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
              )}
            </div>

            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 font-semibold">Item</th>
                  <th className="text-right py-1 font-semibold">Qty</th>
                  <th className="text-right py-1 font-semibold">Price</th>
                  <th className="text-right py-1 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-2">
                      <div className="font-semibold truncate max-w-[120px]">{item.name}</div>
                      {item.discountMinor > 0 && (
                        <div className="text-[10px] text-gray-500">Disc: -{formatCurrency(item.discountMinor, business?.currency)}</div>
                      )}
                    </td>
                    <td className="py-2 text-right align-top">{item.quantity}</td>
                    <td className="py-2 text-right align-top">{formatCurrency(item.unitPriceMinor, business?.currency)}</td>
                    <td className="py-2 text-right align-top font-semibold">{formatCurrency(item.totalMinor, business?.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-gray-300 pt-2 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(sale.subtotalMinor, business?.currency)}</span>
              </div>
              {sale.discountMinor > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(sale.discountMinor, business?.currency)}</span>
                </div>
              )}
              {sale.taxMinor > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(sale.taxMinor, business?.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-300 pt-2 mt-2">
                <span>TOTAL</span>
                <span>{formatCurrency(sale.grandTotalMinor, business?.currency)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 mt-4 pt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="uppercase font-semibold">{sale.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>{formatCurrency(sale.amountPaidMinor, business?.currency)}</span>
              </div>
              {sale.grandTotalMinor - sale.amountPaidMinor > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(sale.grandTotalMinor - sale.amountPaidMinor, business?.currency)}</span>
                </div>
              )}
            </div>

            <div className="text-center mt-8 text-xs text-gray-500">
              <p>Thank you for your business!</p>
              <p>Powered by DukaanSync</p>
            </div>
          </div>

          {/* Footer Controls (Hidden on Print) */}
          <div className="mt-8 flex gap-3 print:hidden">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              New Sale
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
