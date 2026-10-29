import { useEffect, useState } from "react";
import api from "../api/axios";

// url: "/members" or "/books"
// resultKey: "members" or "books" (the array name in the API response)
// renderItem: (item) => { label, sub, disabled }
export default function SearchPicker({ label, url, resultKey, renderItem, selected, onSelect }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(url, { params: { search, limit: 5 } });
        setResults(data[resultKey] || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, selected, url, resultKey]);

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      {selected ? (
        <div className="flex items-center justify-between rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{renderItem(selected).label}</span>
            <span className="ml-2 text-gray-500">{renderItem(selected).sub}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Type to search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border text-sm">
            {loading ? (
              <li className="px-3 py-2 text-gray-500">Searching...</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-gray-500">No results</li>
            ) : (
              results.map((item) => {
                const { label: l, sub, disabled } = renderItem(item);
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(item)}
                      className="flex w-full justify-between px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{l}</span>
                      <span className="text-gray-500">{sub}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}