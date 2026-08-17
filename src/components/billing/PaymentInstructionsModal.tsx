"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CreditCard, ShieldCheck, FileCheck, ArrowRight, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, addDoc, limit, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/Button";
import type { BusinessPlan } from "@/types";

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: BusinessPlan | null;
  targetPlanName: string;
  amountPKR: string;
}

export function PaymentInstructionsModal({
  isOpen,
  onClose,
  targetPlan,
  targetPlanName,
  amountPKR,
}: PaymentInstructionsModalProps) {
  const { business } = useBusiness();
  const { user } = useAuth();
  const [txnRef, setTxnRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingPending, setExistingPending] = useState(false);

  // Parse amountPKR (e.g. "PKR 1,500" -> 1500)
  const numericAmount = parseInt(amountPKR.replace(/[^0-9]/g, "")) || 0;

  // Account details from env
  const accountNo = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER || "";
  const accountTitle = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_TITLE || "";

  useEffect(() => {
    if (!isOpen || !business || !db) return;
    
    // Check if there's already a pending approval
    const checkPending = async () => {
      try {
        const historyRef = collection(db!, "businesses", business.id, "billingHistory");
        const q = query(historyRef, where("status", "==", "pending_approval"), limit(1));
        const snap = await getDocs(q);
        
        setExistingPending(!snap.empty);
        setIsSubmitted(false);
        setTxnRef("");
      } catch (err) {
        console.error("Failed to check billing history:", err);
      }
    };
    checkPending();
  }, [isOpen, business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !business || !user || !targetPlan) return;
    if (!txnRef.trim()) {
      toast.error("Please enter your transaction reference number.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const historyRef = collection(db!, "businesses", business.id, "billingHistory");
      
      // Double check pending
      const q = query(historyRef, where("status", "==", "pending_approval"), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setExistingPending(true);
        toast.info("You already have a pending upgrade request.");
        return;
      }

      await addDoc(historyRef, {
        businessId: business.id,
        plan: targetPlan,
        amountPKR: numericAmount,
        submittedTxnRef: txnRef.trim(),
        submittedBy: user.uid,
        status: "pending_approval",
        createdAt: serverTimestamp(),
      });

      setIsSubmitted(true);
      toast.success("Payment proof submitted successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit payment proof";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden focus:outline-none animate-in zoom-in-95">
          
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f172a] p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <CreditCard className="w-32 h-32 transform rotate-12 translate-x-4 -translate-y-4" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-[#10B981] font-bold text-sm tracking-wider uppercase mb-1">
                  <ShieldCheck className="w-5 h-5" /> Secure Upgrade
                </div>
                <Dialog.Close asChild>
                  <button 
                    disabled={isSubmitting}
                    className="text-slate-300 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>
              
              <h2 className="text-2xl font-bold mb-1">Upgrade to {targetPlanName}</h2>
              <p className="text-slate-300 text-sm">Please follow the payment instructions below to activate your plan.</p>
            </div>
          </div>

          <div className="p-6">
            {existingPending ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-4">
                  <FileCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Upgrade Pending</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  You already have an upgrade request pending review. Our team will verify your payment and activate your plan shortly.
                </p>
                <div className="pt-4">
                  <Button onClick={onClose} className="w-full sm:w-auto">
                    Close
                  </Button>
                </div>
              </div>
            ) : isSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-[#10B981] mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Payment Submitted!</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Your transaction reference <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-800">{txnRef}</span> has been received. 
                  Your account will be upgraded within 12-24 hours after verification.
                </p>
                <div className="pt-4">
                  <Button onClick={onClose} className="w-full sm:w-auto bg-[#10B981] hover:bg-emerald-600">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Instructions Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount Due</p>
                    <p className="text-2xl font-black text-gray-900">{amountPKR}</p>
                  </div>
                  
                  <div className="h-px w-full bg-slate-200"></div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 font-medium">Send the exact amount via EasyPaisa or JazzCash to:</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500">Account Title:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{accountTitle}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wider text-[#10B981]">{accountNo}</span>
                          <button 
                            onClick={() => copyToClipboard(accountNo)}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Account Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submission Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="txnRef" className="block text-sm font-semibold text-gray-900 mb-1">
                      Transaction Reference / TID <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Enter the 11 or 12 digit transaction ID received in your confirmation SMS.
                    </p>
                    <input
                      id="txnRef"
                      type="text"
                      required
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="e.g. 12345678901"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="pt-2 flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#10B981] hover:bg-emerald-600 min-w-[140px]"
                      disabled={isSubmitting || !txnRef.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          Submit Proof <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>

              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
