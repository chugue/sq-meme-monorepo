interface RankBadgeProps {
    rank: number;
    className?: string;
}

export default function RankBadge({ rank, className = "" }: RankBadgeProps) {
    if (rank === 1) {
        return (
            <span className={`inline-flex items-center justify-center w-6 h-6 px-2 py-1 rounded font-bold text-sm bg-gold-base/20 border-2 border-gold-dark text-gold-dark ${className}`}>
                {rank}
            </span>
        );
    } else if (rank === 2) {
        return (
            <span className={`inline-flex items-center justify-center w-6 h-6 px-2 py-1 rounded font-bold text-sm bg-[#7A788A]/20 border-2 border-[#6A6878] text-[#6A6878] ${className}`}>
                {rank}
            </span>
        );
    } else if (rank === 3) {
        return (
            <span className={`inline-flex items-center justify-center w-6 h-6 px-2 py-1 rounded font-bold text-sm bg-[#764F3F]/20 border-2 border-[#654A35] text-[#654A35] ${className}`}>
                {rank}
            </span>
        );
    } else {
        return (
            <span className={`inline-flex items-center justify-center w-6 h-6 px-2 py-1 rounded font-bold text-sm bg-[#7E5C2F]/20  text-[#6B4F25] ${className}`}>
                {rank}
            </span>
        );
    }
}

