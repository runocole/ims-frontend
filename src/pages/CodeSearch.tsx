import React, { useState } from 'react';

// Define the shape of our successful response
interface CodeData {
  serial_number: string;
  code: string;
  expiry_date: string;
  customer_name: string | null;
}

export default function CodeSearch() {
  const [serial, setSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodeData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/public/search-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serial_number: serial }),
      });

      // 1. Check if Django gave us HTML instead of JSON (happens on 500 crashes or 404 Not Found)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Server returned non-JSON:", await response.text());
        throw new Error("Server error: Django returned HTML instead of JSON. Check your Django terminal for crashes.");
      }

      // 2. Safely parse JSON
      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error("Detailed Fetch Error:", err);
      // 3. Display a more accurate error message
      if (err.message === "Failed to fetch") {
        setErrorMsg('CORS error or Django server is not running. Check F12 console and terminal.');
      } else {
        setErrorMsg(err.message || 'An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Find Your Activation Code</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your device's serial number below to securely retrieve your active code.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="serial" className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. SN-123456789"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !serial.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <span className="animate-pulse">Searching securely...</span>
            ) : (
              'Retrieve Code'
            )}
          </button>
        </form>

        {/* Error Message Display */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
            {errorMsg}
          </div>
        )}

        {/* Success Result Display */}
        {result && (
          <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-3">
            <h3 className="text-green-800 font-semibold border-b border-green-200 pb-2">
              Code Found Successfully!
            </h3>
            {result.customer_name && (
              <p className="text-sm text-green-700">
                <span className="font-medium">Registered to:</span> {result.customer_name}
              </p>
            )}
            <div className="bg-white p-3 rounded border border-green-100 text-center mt-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Your Code</span>
              <span className="text-xl font-mono font-bold text-gray-900 tracking-widest">
                {result.code}
              </span>
            </div>
            {result.expiry_date && (
              <p className="text-xs text-center text-green-600 mt-2">
                Valid until: {new Date(result.expiry_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}