import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex" style={{ backgroundColor: '#000' }}>
      <Sidebar />
      <div className="flex-1 min-h-0 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4 text-[#F8F8F8]">
          <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


