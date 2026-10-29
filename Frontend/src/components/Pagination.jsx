export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-gray-600">
        Page {page} of {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}