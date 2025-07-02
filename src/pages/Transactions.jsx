import { useEffect, useState } from "react";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);


  useEffect(() => {
    api.get("/transactions")
      .then((res) => {
        console.log("✅ API response:", res.data);
        // setTransactions(res.data)
      })
      .catch((err) => {
        console.error("❌ API error:", err.response?.status, err.response?.data);
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500">
      <div className="bg-white text-black p-6 rounded-xl shadow-md w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6">Transactions</h1>
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-2 px-4">Date</th>
              <th className="py-2 px-4">Category</th>
              <th className="py-2 px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b text-center">
                <td className="py-2 px-4">{tx.date}</td>
                <td className="py-2 px-4">{tx.category}</td>
                <td className={`py-2 px-4 ${tx.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ${Math.abs(tx.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}