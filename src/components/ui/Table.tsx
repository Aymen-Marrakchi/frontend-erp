import React from "react";

interface Props {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export default function Table({
  headers,
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}