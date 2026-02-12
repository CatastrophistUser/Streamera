import React, { createContext, useContext, useState, useEffect } from 'react';

interface LightsContextType {
    isLightsOff: boolean;
    toggleLights: () => void;
    setLightsOff: (value: boolean) => void;
}

const LightsContext = createContext<LightsContextType | undefined>(undefined);

export function LightsProvider({ children }: { children: React.ReactNode }) {
    const [isLightsOff, setIsLightsOff] = useState(false);

    const toggleLights = () => setIsLightsOff(prev => !prev);
    const setLightsOff = (value: boolean) => setIsLightsOff(value);

    // Prevent scrolling when lights are off if needed, or other global side effects
    useEffect(() => {
        if (isLightsOff) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isLightsOff]);

    return (
        <LightsContext.Provider value={{ isLightsOff, toggleLights, setLightsOff }}>
            {children}
            {/* The Global Overlay */}
            {isLightsOff && (
                <div
                    className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm transition-all duration-500 animate-in fade-in"
                    onClick={() => setIsLightsOff(false)}
                />
            )}
        </LightsContext.Provider>
    );
}

export function useLightsOff() {
    const context = useContext(LightsContext);
    if (context === undefined) {
        throw new Error('useLightsOff must be used within a LightsProvider');
    }
    return context;
}
