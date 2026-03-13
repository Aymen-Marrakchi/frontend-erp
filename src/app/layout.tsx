import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en" data-scroll-behavior="smooth"
      className="dark"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
