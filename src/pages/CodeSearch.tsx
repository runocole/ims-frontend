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
      const response = await fetch('https://inventory.oticgs.com/api/public/search-code/', {
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
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center pt-12 pb-8 px-4 font-sans">
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-3">
          OTIC Geosystems
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Enter your receiver serial number to retrieve access code
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-8 border border-gray-100">
        
        {/* Info Box */}
        <div className="bg-[#f4f9fd] border border-[#dbeaf4] rounded-xl p-5 mb-8">
          <div className="flex items-center text-sm font-semibold text-[#1e3a5f] mb-3">
            <svg className="w-4 h-4 mr-2 text-[#3b82f6]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            How to find your serial number
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Check under or behind your GNSS receiver:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['J11L02578 (Jupiter)', 'N31L06941 (N3)', 'N51L02614 (N5)', 'T31L06714 (T30)'].map(item => (
              <div key={item} className="bg-[#eaf4fc] border border-[#cbe0f5] text-[#1e5b99] text-xs font-mono py-2.5 px-2 rounded-md text-center flex items-center justify-center">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-5">
          <div>
            <label htmlFor="serial" className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5v14M8 5v14M12 5v14M16 5v14M20 5v14" />
              </svg>
              Receiver Serial Number
            </label>
            <input
              type="text"
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-400 focus:outline-none focus:ring-0 focus:border-blue-600 transition-colors font-mono text-sm"
              placeholder="Please enter serial number here"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !serial.trim()}
            className="w-full bg-[#0d6efd] hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center shadow-sm"
          >
            {loading ? (
              <span className="animate-pulse">Searching...</span>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012-2h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a2 2 0 01-2-2zM9 17v-6H5v6h4z" />
                  <circle cx="10" cy="10" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 12.5L16 16m0 0l2-2m-2 2l-2-2" />
                </svg>
                Get Code
              </>
            )}
          </button>
        </form>

        {/* Status Messages */}
        <div className="mt-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-3 animate-fade-in">
              <h3 className="text-green-800 font-semibold border-b border-green-200 pb-2 text-center">
                Code Found Successfully!
              </h3>
              {result.customer_name && (
                <p className="text-sm text-green-700 text-center">
                  <span className="font-medium">Registered to:</span> {result.customer_name}
                </p>
              )}
              <div className="bg-white p-4 rounded-lg border border-green-100 text-center mt-2 shadow-sm">
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Your Access Code</span>
                <span className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                  {result.code}
                </span>
              </div>
              {result.expiry_date && (
                <p className="text-xs text-center text-green-600 mt-2 font-medium">
                  Valid until: {new Date(result.expiry_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Support Section */}
      <div className="mt-10 flex flex-col items-center space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center text-sm text-gray-700 mb-1">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
            For payment assistance:
          </div>
          <a href="tel:07061769934" className="text-[#0d6efd] font-bold text-lg hover:underline">
            07061769934
          </a>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 pt-2">
          <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
          Need help linking your code?
        </div>
        
        <a
          href="https://www.youtube.com/shorts/VYoCjVgX9TQ" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-[#20c997] hover:bg-[#1aa179] text-white font-medium py-2.5 px-6 rounded-full flex items-center transition-colors shadow-sm inline-flex"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
          Watch this short tutorial video
        </a>
      </div>
    </div>
  );
}