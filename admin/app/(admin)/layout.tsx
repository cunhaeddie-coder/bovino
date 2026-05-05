import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { AdminProvider } from "@/lib/admin-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
