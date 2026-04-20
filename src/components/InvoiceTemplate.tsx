import logo from "../assets/otic-geosystems-logo.png";

interface InvoiceItem {
  description: string;
  equipment_type?: string;
  serials?: string[];
  qty: number;
  cost: number;
}

interface InvoiceProps {
  data: {
    invoiceNo: string;
    date: string;
    paymentStatus: string;
    totalCost: number;
    taxAmount: number;
    initialDeposit: number;
    customer: {
      name: string;
      address: string;
    };
    items: InvoiceItem[];
  };
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const InvoiceTemplate = ({ data }: InvoiceProps) => {
  const brandBlue = "#0033A0";

  const isCompleted = data.paymentStatus === "completed" ||
                      data.paymentStatus === "paid"       ||
                      data.paymentStatus === "fully-paid";

  const formatSerialLabel = (serial: string, index: number, type?: string) => {
    const s = serial.toUpperCase();
    const t = (type || "").toUpperCase();
    if (s.includes("ER-") || s.includes("RADIO")) return "Radio";
    if (s.includes("DL-") || s.includes("DATALOGGER")) return "DL";
    if (t.includes("COMBO"))
      return index === 0 ? "R1" : index === 1 ? "R2" : index === 2 ? "DL" : "Radio";
    return "S/N";
  };

  return (
    <div
      id="printable-invoice"
      className="max-w-4xl mx-auto bg-white text-slate-900 p-10 shadow-lg my-8 font-sans"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start border-b pb-8 border-gray-100">
        <div>
          <img src={logo} alt="OTIC GEOSYSTEMS" className="h-16 mb-4 object-contain" />
          <h1 className="text-xl font-extrabold" style={{ color: brandBlue }}>
            OTIC GEOSYSTEMS
          </h1>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            3, Bello Close, Chevyview Estate, Chevron Drive
          </p>
          <p className="text-sm text-gray-600 font-medium">
            Lekki-Epe Expressway, Lagos, Nigeria
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-gray-300 tracking-widest uppercase">
            Invoice
          </h2>
          <p className="font-bold text-lg text-slate-700">#{data.invoiceNo}</p>
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
              Total Amount
            </p>
            <p className="text-2xl font-black text-slate-900">
              NGN {fmt(data.totalCost)}
            </p>
          </div>
        </div>
      </div>

      {/* ── BILL TO ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-8 py-8">
        <div>
          <p className="text-[11px] text-gray-400 mb-2 uppercase font-bold tracking-widest">
            Bill To
          </p>
          <p className="font-extrabold text-slate-800 text-lg uppercase">
            {data.customer.name}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-1">
            {data.customer.address}
          </p>
        </div>
        <div className="flex flex-col items-end justify-center space-y-1.5 text-xs text-gray-600 font-medium">
          <p>
            <span className="font-semibold text-gray-400 uppercase mr-2">Invoice Date:</span>
            {data.date}
          </p>
          <p>
            <span className="font-semibold text-gray-400 uppercase mr-2">Terms:</span>
            Due on Receipt
          </p>
          {isCompleted && (
            <p>
              <span className="font-semibold text-gray-400 uppercase mr-2">Status:</span>
              <span className="text-green-600 font-bold">PAID</span>
            </p>
          )}
        </div>
      </div>

      {/* ── ITEMS TABLE ─────────────────────────────────────────────────────── */}
      <table className="w-full text-left border-collapse mt-4">
        <thead>
          <tr
            className="text-white uppercase text-[10px] tracking-widest"
            style={{ backgroundColor: brandBlue }}
          >
            <th className="p-4 font-bold">#</th>
            <th className="p-4 font-bold">Item & Description</th>
            <th className="p-4 font-bold text-center">Qty</th>
            <th className="p-4 font-bold text-right">Rate (NGN)</th>
            <th className="p-4 font-bold text-right">Amount (NGN)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              <td className="p-4 text-gray-400 font-mono text-xs">{i + 1}</td>
              <td className="p-4">
                <div className="font-bold text-slate-800 text-sm uppercase">
                  {item.description}
                </div>
                {item.equipment_type && (
                  <div
                    className="text-[10px] font-bold uppercase mb-2"
                    style={{ color: brandBlue }}
                  >
                    {item.equipment_type}
                  </div>
                )}
                {item.serials && item.serials.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 gap-1">
                    {item.serials.map((sn, idx) => (
                      <div key={idx} className="text-[10px] flex items-center gap-2">
                        <span className="text-gray-400 font-bold uppercase w-12">
                          {formatSerialLabel(sn, idx, item.equipment_type)}:
                        </span>
                        <span className="text-slate-700 font-mono font-semibold">{sn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-4 text-center text-sm text-slate-600">{item.qty}</td>
              <td className="p-4 text-right text-sm text-slate-600">
                {fmt(item.cost)}
              </td>
              <td className="p-4 text-right font-bold text-slate-900 text-sm">
                {fmt(item.cost * item.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── FINANCIAL SUMMARY ───────────────────────────────────────────────── */}
      <div className="flex justify-end py-10">
        <div className="w-72 space-y-2">



          {/* Total — tax silently included, customer sees one clean number */}
          <div
            className="flex justify-between font-black p-4 text-white text-sm"
            style={{ backgroundColor: brandBlue }}
          >
            <span className="uppercase tracking-widest text-xs">Total</span>
            <span>NGN {fmt(data.totalCost)}</span>
          </div>

          {/* Balance Due — only shown for completed payments */}
          {/* {isCompleted && data.initialDeposit > 0 && data.initialDeposit < data.totalCost && (
            <div
              className="flex justify-between font-black p-4 text-slate-900 border-l-4"
              style={{ borderColor: brandRed }}
            >
              <span className="text-xs uppercase tracking-widest">Balance Due</span>
              <span>NGN {fmt(data.totalCost - data.initialDeposit)}</span>
            </div>
          )} */}

        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div className="mt-12 border-t-2 border-dashed border-gray-100 pt-8 text-[11px] text-gray-500 leading-relaxed">
        <div className="grid grid-cols-2 gap-10">
          <div>
            <p className="font-black text-slate-800 mb-3 uppercase tracking-tighter">
              Payment Information
            </p>
            <p className="mb-1">
              Kindly pay into the account below and send proof of payment.
            </p>
            <div className="space-y-0.5 mt-2">
              <p><span className="font-bold text-slate-700 uppercase">Bank:</span> PROVIDUS BANK</p>
              <p><span className="font-bold text-slate-700 uppercase">Acc Name:</span> OTIC GEOSYSTEMS LTD</p>
              <p><span className="font-bold text-slate-700 uppercase">Acc NO:</span> 1309010165</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mt-4 italic font-medium text-slate-400">
              Thank you for your patronage.
            </p>
            <p className="mt-2 font-black text-slate-700 tracking-widest">
              TIN NO. 31413107-0001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};