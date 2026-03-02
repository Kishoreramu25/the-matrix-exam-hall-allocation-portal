import { useState, useEffect } from "react";
import { Moon, Sun, Palette, Globe, Check, MessageCircle, Phone, Mail, Linkedin, Instagram } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/translations";

const COLORS = [
    { name: "Yellow", value: "48 100% 50%", class: "bg-yellow-500" },
    { name: "Red", value: "0 84.2% 60.2%", class: "bg-red-500" },
    { name: "Blue", value: "221.2 83.2% 53.3%", class: "bg-blue-500" },
    { name: "Violet", value: "262.1 83.3% 57.8%", class: "bg-violet-500" },
    { name: "Green", value: "142.1 76.2% 36.3%", class: "bg-green-500" },
];

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "ta", name: "தமிழ் (Tamil)" },
    { code: "hi", name: "हिंदी (Hindi)" },
];

const Settings = () => {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [primaryColor, setPrimaryColor] = useState("48 100% 50%");

    useEffect(() => {
        // Load saved settings
        const savedTheme = localStorage.getItem("theme");
        const savedColor = localStorage.getItem("primaryColor");

        if (savedTheme === "dark") {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove("dark");
        }

        if (savedColor) {
            setPrimaryColor(savedColor);
        }
    }, []);

    const toggleTheme = (checked: boolean) => {
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const changeColor = (colorValue: string) => {
        setPrimaryColor(colorValue);
        document.documentElement.style.setProperty("--primary", colorValue);
        document.documentElement.style.setProperty("--ring", colorValue);
        localStorage.setItem("primaryColor", colorValue);
        toast.success(t("theme.updated"));
    };

    const changeLanguage = (langCode: string) => {
        setLanguage(langCode as Language);
        toast.success(t("lang.changed"));
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">{t("settings")}</h1>

                <div className="space-y-6">
                    {/* Theme Section */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                <div>
                                    <h2 className="font-semibold text-lg">{t("appearance")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("appearance.desc")}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isDarkMode}
                                onCheckedChange={toggleTheme}
                            />
                        </div>
                    </Card>

                    {/* Color Customization Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Palette className="h-5 w-5" />
                            <div>
                                <h2 className="font-semibold text-lg">{t("accent.color")}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {t("accent.desc")}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4 mt-4">
                            {COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => changeColor(color.value)}
                                    className={`
                    relative h-12 w-12 rounded-full ${color.class} 
                    flex items-center justify-center transition-transform hover:scale-110
                    ${primaryColor === color.value ? 'ring-4 ring-offset-2 ring-offset-background' : ''}
                  `}
                                    title={color.name}
                                >
                                    {primaryColor === color.value && (
                                        <Check className="h-6 w-6 text-white drop-shadow-md" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Language Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="h-5 w-5" />
                            <div>
                                <h2 className="font-semibold text-lg">{t("language")}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {t("language.desc")}
                                </p>
                            </div>
                        </div>

                        <RadioGroup value={language} onValueChange={changeLanguage} className="gap-4">
                            {LANGUAGES.map((lang) => (
                                <div key={lang.code} className="flex items-center space-x-2">
                                    <RadioGroupItem value={lang.code} id={lang.code} />
                                    <Label htmlFor={lang.code} className="text-base cursor-pointer">
                                        {lang.name}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </Card>

                    {/* Feedback Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageCircle className="h-5 w-5" />
                            <div>
                                <h2 className="font-semibold text-lg">{t("feedback.title")}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {t("feedback.subtitle")}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate("/feedback")}
                            className="w-full"
                            variant="outline"
                        >
                            {t("feedback.title")}
                        </Button>
                    </Card>

                    {/* Contact Us Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Phone className="h-5 w-5" />
                            <div>
                                <h2 className="font-semibold text-lg">{t("contact.us")}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {t("contact.desc")}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <a href="tel:9042427828" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                <Phone className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{t("phone")}</p>
                                    <p className="text-sm text-muted-foreground">9042427828</p>
                                </div>
                            </a>
                            <a href="mailto:zenetive@gmail.com" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                <Mail className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{t("email")}</p>
                                    <p className="text-sm text-muted-foreground">zenetive@gmail.com</p>
                                </div>
                            </a>
                            <a href="https://www.linkedin.com/company/108417519/admin/dashboard/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                <Linkedin className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{t("linkedin")}</p>
                                    <p className="text-sm text-muted-foreground">Zenetive Infotech</p>
                                </div>
                            </a>
                            <a href="https://www.instagram.com/zenetive.india?igsh=cXo1NXp3ODJmZGVv" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                <Instagram className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{t("instagram")}</p>
                                    <p className="text-sm text-muted-foreground">@zenetive.india</p>
                                </div>
                            </a>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Settings;
