export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-card p-8 sm:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
            <br />
            <span className="text-amber-600 font-medium">Draft — pending legal review</span>
          </p>
        </div>

        <div className="prose prose-emerald max-w-none text-gray-600">
          {/* Note: This is an AI-drafted template and not a substitute for actual legal review. */}
          
          <p>
            At DukaanSync, we take your privacy and the security of your data seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our multi-shop retail management platform.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect the following types of information to provide and improve our services:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account & Business Information:</strong> When you register, we collect your name, email address, business name, and store locations.</li>
            <li><strong>Operational Data:</strong> We store the data you generate while using the app, including sales records, inventory movements, customer and supplier ledgers, and financial reports.</li>
            <li><strong>Payment Proof Submissions:</strong> For manual plan upgrades via EasyPaisa or JazzCash, we collect transaction reference numbers and payment proof submitted by business owners. We do not store direct bank account credentials or credit card numbers.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p>
            Your information is used strictly to provide the DukaanSync service:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To operate, maintain, and secure your point-of-sale and inventory system.</li>
            <li>To enforce strict data isolation between different shops and businesses.</li>
            <li>To process your manual subscription payments and verify account upgrades.</li>
            <li>To provide customer support and send critical service updates.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Storage & Security (Firebase)</h2>
          <p>
            DukaanSync uses Google Firebase as our primary data processor. All business data, customer records, and authentication details are securely stored on Firebase servers, which comply with strict international security standards. We implement Firestore Security Rules to ensure that your data is only accessible to authorized members of your specific business.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Retention</h2>
          <p>
            We retain your business data for as long as your account is active. If you choose to delete your DukaanSync account, your primary business data and associated shop records will be permanently deleted from our active servers within 30 days, subject to any legal obligations to retain specific financial records (such as billing history).
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
          <p>
            You have the right to access, update, or request the deletion of your personal and business data. If you wish to exercise these rights or have questions about how your data is handled, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
