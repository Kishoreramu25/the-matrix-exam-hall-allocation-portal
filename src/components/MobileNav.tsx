import { Home, GraduationCap, LayoutGrid, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const MobileNav = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border/50 p-3 md:hidden z-50 pb-safe shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center max-w-md mx-auto">
                <Link
                    to="/"
                    className={`p-2 rounded-full transition-all duration-300 ${isActive("/") ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Home className={`h-7 w-7 ${isActive("/") ? "fill-current" : ""}`} strokeWidth={isActive("/") ? 2.5 : 2} />
                </Link>

                <Link
                    to="/student"
                    className={`p-2 rounded-full transition-all duration-300 ${isActive("/student") ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <GraduationCap className={`h-7 w-7 ${isActive("/student") ? "fill-current" : ""}`} strokeWidth={isActive("/student") ? 2.5 : 2} />
                </Link>

                <Link
                    to="/admin"
                    className={`p-2 rounded-full transition-all duration-300 ${isActive("/admin") || isActive("/auth") ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <LayoutGrid className={`h-7 w-7 ${isActive("/admin") ? "fill-current" : ""}`} strokeWidth={isActive("/admin") ? 2.5 : 2} />
                </Link>

                <Link
                    to="/settings"
                    className={`p-2 rounded-full transition-all duration-300 ${isActive("/settings") ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Settings className={`h-7 w-7 ${isActive("/settings") ? "fill-current" : ""}`} strokeWidth={isActive("/settings") ? 2.5 : 2} />
                </Link>
            </div>
        </div>
    );
};

export default MobileNav;
