export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-card p-8 sm:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Terms of Service</h1>
          <p className="text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
            <br />
            <span className="text-amber-600 font-medium">Draft — pending legal review</span>
          </p>
        </div>

        <div className="prose prose-emerald max-w-none text-gray-600">
          {/* Note: This is an AI-drafted template and not a substitute for actual legal review. */}
          
          <p>
            Welcome to DukaanSync. By accessing or using our point-of-sale and retail management services, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Service Description</h2>
          <p>
            DukaanSync is a cloud-based Software-as-a-Service (SaaS) platform designed for multi-shop retail management. We provide tools for point-of-sale (POS) operations, inventory tracking, customer/supplier ledgers, and financial reporting.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Account Responsibilities</h2>
          <p>
            As a business owner, you are responsible for maintaining the confidentiality of your account login credentials. You are also fully responsible for all activities that occur under your account, including the actions of cashiers or managers to whom you grant access. You agree to provide accurate and complete information during onboarding and keep it updated.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Manual Payment & Plan Approval</h2>
          <p>
            DukaanSync offers premium plans ("Basic" and "Pro") which require payment.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Manual Processing:</strong> Payments are processed manually via direct bank transfer, EasyPaisa, or JazzCash to our designated accounts.</li>
            <li><strong>Proof of Payment:</strong> You must submit accurate transaction reference IDs via the DukaanSync billing dashboard.</li>
            <li><strong>Approval Process:</strong> Plan upgrades are not instant. Access to premium features will be granted only after our administrative team manually verifies the transaction against our bank records. Providing fraudulent or forged payment proof will result in immediate account termination.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Acceptable Use</h2>
          <p>
            You agree not to use DukaanSync for any illegal or unauthorized purpose. You must not:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Attempt to bypass our security measures or access data belonging to other businesses.</li>
            <li>Use the platform to sell illegal or heavily regulated goods without proper authorization.</li>
            <li>Upload malicious code, viruses, or spam.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, DukaanSync shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the service. We do not guarantee that the service will be uninterrupted or completely error-free.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of significant changes via the email address associated with your account or through an in-app notification.
          </p>
        </div>
      </div>
    </div>
  );
}
