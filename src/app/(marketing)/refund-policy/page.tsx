export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-card p-8 sm:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
            <br />
            <span className="text-amber-600 font-medium">Draft — pending legal review</span>
          </p>
        </div>

        <div className="prose prose-emerald max-w-none text-gray-600">
          {/* Note: This is an AI-drafted template and not a substitute for actual legal review. */}
          
          <p>
            Because DukaanSync processes subscription payments manually via direct transfer (e.g., EasyPaisa, JazzCash, or bank transfer), it is important that you understand our policies regarding refunds, rejected approvals, and downgrades.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Rejected Approvals</h2>
          <p>
            When you submit a payment transaction ID for a plan upgrade, our team manually verifies the transfer.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Invalid Proof:</strong> If your submitted transaction ID cannot be found or the amount is incorrect, your upgrade request will be rejected. You will not be charged by us, but you may need to check with your bank if funds were deducted.</li>
            <li><strong>Accidental Overpayment:</strong> If you accidentally transferred more than the required amount and your upgrade was rejected so we could resolve the discrepancy, please contact support immediately to arrange a partial or full refund of the overpaid amount.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Cancellations and Downgrades</h2>
          <p>
            You can choose to cancel your premium subscription or downgrade to the Free Plan at any time from your billing dashboard.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>No Prorated Refunds:</strong> Because payments are collected manually upfront, downgrading your account before the end of your billing cycle does not automatically entitle you to a prorated cash refund for the unused time. Your account will simply revert to Free Plan limits immediately.</li>
            <li><strong>Data Limits on Downgrade:</strong> If you downgrade to a plan with lower limits (e.g., from 3 shops to 1 shop), you will lose access to the data for the excess shops until you upgrade again. Your data is not deleted immediately, but it becomes inaccessible.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Exceptional Refunds</h2>
          <p>
            We may issue a refund at our sole discretion under exceptional circumstances, such as:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Extended platform outages lasting more than 48 hours.</li>
            <li>Duplicate payments made in error for the same billing cycle.</li>
          </ul>
          <p>
            Refunds will be processed back to the original EasyPaisa, JazzCash, or bank account used for the payment within 7-14 business days.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Contact Us</h2>
          <p>
            If you believe you have been incorrectly billed or need to dispute a rejected upgrade, please contact our support team with your Business ID and the original transaction SMS/receipt.
          </p>
        </div>
      </div>
    </div>
  );
}
