import { Link, useLocation } from 'react-router-dom';
import { Tv, Search, Film, ChevronUp, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { SpotlightSearch } from './SpotlightSearch';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/utils/cn';

import { useTheme } from '@/hooks/useTheme';

export function Navbar() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showLogo, setShowLogo] = useState(true);
    const [showTopButton, setShowTopButton] = useState(false);
    const [logoAnimation, setLogoAnimation] = useState<'fade' | 'slide'>('fade');
    const lastScrollY = useRef(0);
    const isScrollingToTop = useRef(false);
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const [scrollY, setScrollY] = useState(0);

    const isHomePage = location.pathname === '/';
    const isAtTop = scrollY < 400;

    useEffect(() => {
        const handleScroll = () => {
            if (isScrollingToTop.current) return;

            const currentScrollY = window.scrollY;
            setScrollY(currentScrollY);

            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowLogo(false);
                setTimeout(() => setLogoAnimation('fade'), 500);
            } else {
                setShowLogo(true);
            }

            setShowTopButton(currentScrollY > 500);
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Ctrl + K Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const scrollToTop = () => {
        isScrollingToTop.current = true;
        setShowLogo(false);
        setShowTopButton(false); // Immediately hide the button
        setLogoAnimation('slide');

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        setTimeout(() => {
            isScrollingToTop.current = false;
            setShowLogo(true);
            lastScrollY.current = 0;
        }, 850);
    };

    return (
        <>
            {/* Logo Container */}
            <div className="fixed top-4 md:top-6 left-4 md:left-10 z-[60] transition-opacity duration-500 hidden md:flex items-center h-[52px] md:h-[60px]">
                <Link to="/" className="text-accent transform hover:scale-105 transition-transform block">
                    <Logo
                        animate
                        show={showLogo}
                        type={logoAnimation}
                        forceInverse={isHomePage && isAtTop}
                    />
                </Link>
            </div>

            {/* Floating Oval Navbar */}
            <nav className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl px-1 md:px-2 py-1 md:py-2 transition-all duration-500">
                <div className="flex items-center gap-1">
                    <Link
                        to="/movies"
                        className={cn(
                            "p-3 rounded-full transition-all duration-300 group relative",
                            "hover:bg-accent/10 text-white/40 hover:text-accent"
                        )}
                        title="Movies"
                    >
                        <Film size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-accent">Movies</span>
                    </Link>

                    <Link
                        to="/tv"
                        className={cn(
                            "p-3 rounded-full transition-all duration-300 group relative",
                            "hover:bg-accent/10 text-white/40 hover:text-accent"
                        )}
                        title="TV Shows"
                    >
                        <Tv size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-accent">Shows</span>
                    </Link>

                    <div className="w-[1px] h-4 bg-white/10 mx-1" />

                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className={cn(
                            "p-3 rounded-full transition-all duration-300 group relative",
                            "hover:bg-accent/20 text-white/40 hover:text-accent"
                        )}
                        title="Search"
                    >
                        <Search size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-accent">Search</span>
                    </button>
                </div>
            </nav>


            {/* Glassmorphic Circular Back to Top Button */}
            <button
                onClick={scrollToTop}
                className={cn(
                    "fixed bottom-8 right-8 z-50 p-5 rounded-full shadow-2xl transition-all duration-500 transform overflow-hidden",
                    "bg-white/[0.03] backdrop-blur-3xl border border-white/10",
                    "hover:scale-110 active:scale-95 group text-accent hover:border-accent/40",
                    showTopButton ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
                )}
            >
                <ChevronUp size={24} className="group-hover:-translate-y-1 transition-transform" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-accent opacity-0 group-hover:opacity-100 transition-opacity">Top</span>
            </button>

            {/* Theme Toggle Button */}
            <div className="fixed top-4 md:top-6 right-4 md:right-10 z-[10000] transition-all duration-500">
                <button
                    onClick={toggleTheme}
                    className={cn(
                        "p-3.5 md:p-4 rounded-full shadow-2xl transition-all duration-500 transform overflow-hidden relative group",
                        "bg-white/[0.03] backdrop-blur-3xl border border-white/10",
                        "hover:scale-110 active:scale-95 text-accent hover:border-accent/40",
                        !isDarkMode && "bg-[#18181b]/10 border-[#18181b]/30 text-[#18181b] shadow-[0_0_20px_rgba(24,24,27,0.1)]"
                    )}
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    <div className="relative z-10 transition-transform duration-500 group-hover:rotate-12">
                        {isDarkMode ? (
                            <Sun size={20} className="animate-in zoom-in spin-in-90 duration-500" />
                        ) : (
                            <Moon size={20} className="animate-in zoom-in spin-in-90 duration-500" />
                        )}
                    </div>
                </button>
            </div>

            {isSearchOpen && (
                <SpotlightSearch onClose={() => setIsSearchOpen(false)} />
            )}
        </>
    );
}
