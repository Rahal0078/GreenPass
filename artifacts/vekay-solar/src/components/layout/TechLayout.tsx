import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export function TechLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { queryClient.clear(); setLocation("/login"); },
      onError: () => { queryClient.clear(); setLocation("/login"); },
    });
  };

  const handlePushToggle = async () => {
    if (subscribed) {
      await unsubscribe();
      toast({ title: "Notifications disabled", description: "You won't receive push notifications anymore." });
    } else {
      await subscribe();
      toast({ title: "Notifications enabled", description: "You'll be notified when new jobs are assigned to you." });
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 dark:bg-black">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/tech" className="flex items-center">
              <img src="/greenpass-logo.jpeg" alt="GreenPass Technologies" className="h-9 object-contain" />
            </Link>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block mr-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>

              {supported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePushToggle}
                  disabled={loading}
                  title={subscribed ? "Disable push notifications" : "Enable push notifications"}
                  className={subscribed ? "text-green-600 hover:text-green-700" : "text-gray-400 hover:text-gray-600"}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : subscribed ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col relative w-full h-[calc(100dvh-64px)]">
        {children}
      </main>
    </div>
  );
}
