import { Link, useLocation } from 'react-router-dom';
import { Tv, Search, Film, ChevronUp, Moon, Sun } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { SpotlightSearch } from './SpotlightSearch';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/utils/cn';
import { useLightsOff } from '@/context/LightsContext';

export function Navbar() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showLogo, setShowLogo] = useState(true);
    const [showTopButton, setShowTopButton] = useState(false);
    const [logoAnimation, setLogoAnimation] = useState<'fade' | 'slide'>('fade');
    const lastScrollY = useRef(0);
    const isScrollingToTop = useRef(false);
    const location = useLocation();
    const { isLightsOff, toggleLights } = useLightsOff();

    const isWatchPage = location.pathname.startsWith('/watch/');

    useEffect(() => {
        const handleScroll = () => {
            if (isScrollingToTop.current) return;

            const currentScrollY = window.scrollY;

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
            <div className={cn(
                "fixed top-4 md:top-6 left-4 md:left-10 z-[60] transition-opacity duration-500 flex items-center h-[52px] md:h-[60px]",
                isLightsOff ? "opacity-20 pointer-events-none" : "opacity-100"
            )}>
                <Link to="/" className="text-accent transform hover:scale-105 transition-transform block">
                    <Logo
                        animate
                        show={showLogo}
                        type={logoAnimation}
                    />
                </Link>
            </div>

            {/* Floating Oval Navbar */}
            <nav className={cn(
                "fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl px-1 md:px-2 py-1 md:py-2 transition-all duration-500",
                isLightsOff ? "opacity-20 pointer-events-none scale-95" : "opacity-100"
            )}>
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

            {/* Lights Off Button - Circular Glassmorphic at Top Right aligned with pill */}
            <div className={cn(
                "fixed top-4 md:top-6 right-4 md:right-10 z-[80] transition-all duration-500",
                !isWatchPage && "opacity-0 pointer-events-none translate-x-10"
            )}>
                <button
                    onClick={toggleLights}
                    className={cn(
                        "p-3.5 md:p-4 rounded-full shadow-2xl transition-all duration-500 transform overflow-hidden relative group",
                        "bg-white/[0.03] backdrop-blur-3xl border border-white/10",
                        "hover:scale-110 active:scale-95 text-accent hover:border-accent/40",
                        isLightsOff && "bg-accent/10 border-accent/30 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]"
                    )}
                    title={isLightsOff ? "Turn On Lights" : "Turn Off Lights"}
                >
                    <div className="relative z-10">
                        {isLightsOff ? (
                            <Sun size={20} className="animate-in zoom-in duration-300" />
                        ) : (
                            <Moon size={20} className="animate-in zoom-in duration-300" />
                        )}
                    </div>

                    {/* Tooltip */}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {isLightsOff ? "Turn On" : "Turn Off"}
                    </span>
                </button>
            </div>

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

            <SpotlightSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
}
