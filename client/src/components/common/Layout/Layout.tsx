import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Sidebar stays closed until user toggles

  return (
    <div className="min-h-screen w-full flex bg-black md:bg-transparent relative">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-h-0 flex flex-col">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-hidden p-2 sm:p-3 text-[#F8F8F8]">
          <div className="max-w-screen-xl 2xl:max-w-screen-2xl mx-auto px-1 sm:px-3 lg:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


