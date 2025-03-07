import React, { createContext, useContext, useState, ReactNode } from "react";

interface Stats {
    stats: {
        students_count: number;
        teachers_count: number;
        lectures_count: number;
    },
    _links: {
        view_students: { href: string; method: string };
        view_lectures: { href: string; method: string };
        view_teachers: { href: string; method: string };
    }
}

interface StatsContextType {
    stats: Stats | null;
    setStats: (stats: Stats | null) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<Stats | null>(null);

    return (
        <StatsContext.Provider value={{ stats, setStats }}>
            {children}
        </StatsContext.Provider>
    );
};

export const useStats = (): StatsContextType => {
    const context = useContext(StatsContext);
    if (!context) {
        throw new Error("useStats must be used within a StatsProvider");
    }
    return context;
};
