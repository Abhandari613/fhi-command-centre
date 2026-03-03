export function AuroraBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="aurora-blur bg-primary top-[-50px] left-[-50px]" />
            <div className="aurora-blur bg-fuchsia-500 bottom-[-50px] right-[-50px]" />
        </div>
    );
}
