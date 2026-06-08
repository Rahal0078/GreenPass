import { ReactNode } from "react";
import { Link } from "wouter";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/greenpass-logo.jpeg" alt="GreenPass Technologies" className="h-10 object-contain" />
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              New Complaint
            </Link>
            <Link href="/track/search" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Track Ticket
            </Link>
            <Link href="/login" className="text-sm font-medium bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
              Staff Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      <footer className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} GreenPass Technologies. Kerala's Leading Solar Project Expert.</p>
          <Link href="/login" className="mt-2 inline-block text-xs text-gray-400 hover:text-primary transition-colors">
            Staff Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
