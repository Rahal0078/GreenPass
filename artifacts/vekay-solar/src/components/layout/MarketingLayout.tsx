import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, TrendingUp, Home } from "lucide-react";

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { queryClient.clear(); setLocation("/login"); },
      onError: () => { queryClient.clear(); setLocation("/login"); },
    });
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-between h-14 items-center">
            <Link href="/marketing" className="flex items-center gap-2">
              <div className="bg-green-600 rounded-lg p-1.5">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">GreenPass Technologies</p>
                <p className="text-[10px] text-green-600 font-medium leading-none mt-0.5">Sales Portal</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block mr-1">
                <p className="text-xs font-semibold text-gray-900">{user?.name}</p>
                <p className="text-[10px] text-green-600">Marketing Staff</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="h-8 w-8">
                <LogOut className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom nav for mobile */}
      <main className="flex-1 max-w-2xl w-full mx-auto pb-4">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30 sm:hidden">
        <div className="flex">
          <Link
            href="/marketing"
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium ${
              location === "/marketing" ? "text-green-600" : "text-gray-500"
            }`}
          >
            <Home className="h-5 w-5 mb-0.5" />
            Home
          </Link>
          <Link
            href="/marketing"
            className="flex-1 flex flex-col items-center py-2 text-[10px] font-medium text-gray-500"
          >
            <TrendingUp className="h-5 w-5 mb-0.5" />
            Enquiries
          </Link>
        </div>
      </nav>
    </div>
  );
}
