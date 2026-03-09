import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({
  placeholder,
  value,
  onChange,
  className = "",
  ...props
}: Props) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:bg-slate-900 dark:focus:ring-slate-800 ${className}`}
      {...props}
    />
  );
}