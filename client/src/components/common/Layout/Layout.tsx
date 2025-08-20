import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex" style={{ backgroundColor: '#000' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-4 text-[#F8F8F8]">{children}</main>
      </div>
    </div>
  );
};


