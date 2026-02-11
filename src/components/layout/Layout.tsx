import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="min-vh-100 bg-neutral-950 text-white selection:bg-brand-primary selection:text-white">
            <Navbar />
            <main className="pb-20">
                <Outlet />
            </main>
            <footer className="border-t border-white/10 py-12 bg-black/40">
                <div className="max-w-7xl mx-auto px-4 text-center text-white/40 text-sm">
                    <p>© {new Date().getFullYear()} Streamera. All rights reserved.</p>
                    <p className="mt-2 text-xs">Data provided by TMDB. Video content via vidsrc.dev.</p>
                </div>
            </footer>
        </div>
    );
}
