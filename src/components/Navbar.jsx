import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="p-4 bg-blue-600 text-white flex justify-between">
      <div className="font-bold">💰 Finance Tracker</div>
      <div className="space-x-4">
        <Link to="/">Dashboard</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
}