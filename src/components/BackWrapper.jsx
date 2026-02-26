import { Link } from "react-router-dom";

export default function BackWrapper({ children }) {
  return (
    <div className="relative">
      {/* Back button */}
      <Link
        to="/"
        className="absolute top-4 left-4 px-4 py-2 rounded-lg bg-pink-300 
                   hover:bg-pink-400 text-white text-sm shadow-md transition"
      >
        ← Back
      </Link>

      {/* Wrapped content */}
      {children}
    </div>
  );
}
