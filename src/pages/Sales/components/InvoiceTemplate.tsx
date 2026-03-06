import React from 'react';
import logo from "../assets/otic-logo.png"; // [cite: 1, 2]

interface InvoiceProps {
  data: {
    invoiceNo: string; // [cite: 14]
    date: string; // [cite: 16]
    customer: {
      name: string; // [cite: 8]
      address: string; // [cite: 9, 10, 11]
    };
    items: Array<{
      description: string; // [cite: 17]
      qty: number; // [cite: 17]
      rate: number; // [cite: 17]
      discount: number; // [cite: 17]
    }>;
    paymentMade: number; // [cite: 18]
  };
}

export const InvoiceTemplate = ({ data }: InvoiceProps) => {
  const subTotal = data.items.reduce((acc, item) => acc + (item.qty * item.rate), 0); // [cite: 18]
  const totalAfterDiscount = subTotal - data.items.reduce((acc, item) => acc + item.discount, 0); // [cite: 17, 18]
  const balanceDue = totalAfterDiscount - data.paymentMade; // [cite: 15, 18]

  return (
    <div className="max-w-4xl mx-auto bg-white text-slate-900 p-10 shadow-lg my-8 font-sans" id="printable-invoice">
      {/* Header section matching OTIC layout [cite: 1, 13] */}
      <div className="flex justify-between items-start border-b pb-8 border-gray-200">
        <div>
          <img src={logo} alt="OTIC" className="h-12 mb-4" /> 
          <h1 className="text-xl font-bold text-blue-900">OTIC SURVEYS LTD</h1> 
          <p className="text-sm text-gray-600">3, Bello Close, Chevyview Estate, Chevron Drive</p> 
          <p className="text-sm text-gray-600">Lekki-Epe Expressway, Lagos, Nigeria</p> 
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-gray-400 tracking-widest">INVOICE</h2> 
          <p className="font-semibold text-lg">#{data.invoiceNo}</p> 
          <div className="mt-4">
            <p className="text-sm text-gray-500 uppercase">Balance Due</p> 
            <p className="text-2xl font-bold text-slate-800">NGN {balanceDue.toLocaleString()}.00</p> 
          </div>
        </div>
      </div>

      {/* Bill To & Dates [cite: 7, 8, 16] */}
      <div className="grid grid-cols-2 gap-8 py-8">
        <div>
          <p className="text-sm text-gray-500 mb-1 uppercase font-semibold">Bill To</p> 
          <p className="font-bold text-lg">{data.customer.name}</p> 
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{data.customer.address}</p> 
        </div>
        <div className="flex flex-col items-end justify-center space-y-1 text-sm">
          <p><span className="text-gray-500">Invoice Date:</span> <span className="font-medium">{data.date}</span></p> 
          <p><span className="text-gray-500">Terms:</span> <span className="font-medium">Due on Receipt</span></p> 
          <p><span className="text-gray-500">Due Date:</span> <span className="font-medium">{data.date}</span></p> 
        </div>
      </div>

      {/* Items Table [cite: 17] */}
      <table className="w-full text-left border-collapse mt-4">
        <thead>
          <tr className="bg-slate-800 text-white uppercase text-xs">
            <th className="p-3 font-semibold">#</th>
            <th className="p-3 font-semibold">Item & Description</th>
            <th className="p-3 font-semibold text-center">Qty</th>
            <th className="p-3 font-semibold text-right">Rate</th>
            <th className="p-3 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 text-sm">
              <td className="p-3 text-gray-500">{i + 1}</td>
              <td className="p-3 font-medium">{item.description}</td>
              <td className="p-3 text-center">{item.qty.toFixed(2)}</td>
              <td className="p-3 text-right">{item.rate.toLocaleString()}.00</td>
              <td className="p-3 text-right font-semibold">{(item.qty * item.rate).toLocaleString()}.00</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary [cite: 18] */}
      <div className="flex justify-end py-8">
        <div className="w-72 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sub Total</span>
            <span>{subTotal.toLocaleString()}.00</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2 text-slate-800">
            <span>Total</span>
            <span>NGN {totalAfterDiscount.toLocaleString()}.00</span>
          </div>
          <div className="flex justify-between text-red-600 font-medium">
            <span>Payment Made</span>
            <span>(-) {data.paymentMade.toLocaleString()}.00</span>
          </div>
          <div className="flex justify-between font-bold bg-gray-100 p-3 text-slate-900 border-l-4 border-slate-800">
            <span>Balance Due</span>
            <span>NGN {balanceDue.toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      {/* Notes & Bank Details [cite: 19, 20, 21, 22] */}
      <div className="mt-12 border-t pt-6 text-xs text-gray-500 leading-relaxed">
        <p className="font-bold text-gray-700 mb-2 uppercase tracking-wider">Notes</p> 
        <p>Kindly pay into this account below and send proof of payment.</p> 
        <p className="mt-1"><span className="font-semibold text-gray-700">Bank:</span> Zenith Bank</p> 
        <p><span className="font-semibold text-gray-700">Account Name:</span> OTIC SURVEYS</p> 
        <p><span className="font-semibold text-gray-700">Account NO:</span> 1015175251</p> 
        <p className="mt-4 italic">Thank you for your patronage.</p> 
        <p className="mt-2 font-medium">TIN NO. 31413107-0001</p> 
      </div>
    </div>
  );
};