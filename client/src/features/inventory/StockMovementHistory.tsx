import React from "react";

// Dummy data for demonstration
const movements = [
  {
    id: 1,
    product: "Samsung Galaxy S24",
    sku: "ELK001",
    type: "increase",
    quantity: 10,
    reason: "Stock Take",
    date: "2025-08-19 10:30",
    user: "admin"
  },
  {
    id: 2,
    product: "iPhone 15 Pro",
    sku: "ELK002",
    type: "decrease",
    quantity: 2,
    reason: "Damaged Goods",
    date: "2025-08-18 14:20",
    user: "cashier"
  },
  {
    id: 3,
    product: "Dell XPS 13",
    sku: "ELK003",
    type: "set",
    quantity: 8,
    reason: "Correction",
    date: "2025-08-17 09:10",
    user: "admin"
  }
];

export const StockMovementHistory: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h2 className="text-xl font-semibold text-[#F8F8F8] mb-4">Stock Movement History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-white/10">
              <th className="px-4 py-2 text-[#F8F8F8]/80">Date</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Product</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">SKU</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Type</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Quantity</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Reason</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">User</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-white/10 last:border-b-0">
                <td className="px-4 py-2 text-[#F8F8F8]/70">{m.date}</td>
                <td className="px-4 py-2 text-[#F8F8F8]">{m.product}</td>
                <td className="px-4 py-2 text-[#F8F8F8]/70">{m.sku}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${m.type === "increase" ? "bg-green-500/20 text-green-400" : m.type === "decrease" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>{m.type}</span>
                </td>
                <td className="px-4 py-2 text-[#F8F8F8]">{m.quantity}</td>
                <td className="px-4 py-2 text-[#F8F8F8]/70">{m.reason}</td>
                <td className="px-4 py-2 text-[#F8F8F8]/70">{m.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
