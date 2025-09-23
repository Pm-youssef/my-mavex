'use client';

import { useState } from 'react';

export default function TestCheckoutPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              id: 'test-product-id',
              size: 'M',
              quantity: 1,
              price: 100,
            },
          ],
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerPhone: '01234567890',
          customerAddress: 'Test Address',
          customerCity: 'Test City',
          customerGovernorate: 'cairo',
          customerPostalCode: '12345',
          paymentMethod: 'COD',
          shippingMethod: 'STANDARD',
        }),
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      <div className="mavex-container">
        <div className="text-center mb-8">
          <h1 className="royal-title text-[#0c1420] mb-8">Test Checkout API</h1>
          <button
            onClick={testCheckout}
            disabled={loading}
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Checkout'}
          </button>
        </div>

        {result && (
          <div className="modern-card">
            <h2 className="text-2xl font-bold mb-4">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
