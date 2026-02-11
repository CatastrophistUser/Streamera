import { cn } from '@/utils/cn';
import logoUrl from '@/assets/logo.svg';

interface LogoProps {
    className?: string;
    animate?: boolean;
    show?: boolean;
    type?: 'fade' | 'slide';
}

export function Logo({ className, animate = false, show = true, type = 'fade' }: LogoProps) {
    return (
        <div
            className={cn(
                "relative transition-all duration-700 ease-out pt-1.5",
                className,
                // Animation logic
                animate && type === 'fade' && (show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"),
                animate && type === 'slide' && (show ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"),
                !show && !animate && "opacity-0"
            )}
        >
            <img src={logoUrl} alt="Streamera" className="h-4 w-auto block" />
        </div>
    );
}
