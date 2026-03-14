export function AuroraBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Top-left ember glow — like Trail Boss LED running light */}
            <div className="ember-glow bg-primary top-[-150px] left-[-100px] animate-[ember-pulse_4s_ease-in-out_infinite]" />
            {/* Bottom-right warm steel reflection */}
            <div className="ember-glow bg-orange-900/50 bottom-[-200px] right-[-150px] animate-[ember-pulse_5s_ease-in-out_infinite_1s]" />
            {/* Subtle top edge light — like chrome trim line */}
            <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
    );
}
