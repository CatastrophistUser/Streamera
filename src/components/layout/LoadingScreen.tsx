import { useEffect, useState } from 'react';
import logoUrl from '@/assets/logo.svg';
import { cn } from '@/utils/cn';

export function LoadingScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        // Prevent scrolling while loading
        document.body.style.overflow = 'hidden';

        const timer = setTimeout(() => {
            setIsVisible(false);

            // Allow fade out animation to finish before removing from DOM
            setTimeout(() => {
                setShouldRender(false);
                // Restore scrolling
                document.body.style.overflow = 'unset';
            }, 700);
        }, 1200); // 1.2s loading time

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!shouldRender) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[99999] flex items-center justify-center bg-black transition-opacity duration-700 ease-in-out",
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
        >
            <div className={cn(
                "relative flex flex-col items-center justify-center gap-4",
                "transition-all duration-700 transform",
                isVisible ? "scale-100 blur-0" : "scale-110 blur-sm"
            )}>
                <img
                    src={logoUrl}
                    alt="Streamera"
                    className="w-[80vw] max-w-[300px] md:max-w-md h-auto animate-pulse"
                />
            </div>
        </div>
    );
}
