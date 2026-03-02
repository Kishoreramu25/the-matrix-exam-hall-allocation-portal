import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

const Feedback = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: "",
        college: "",
        content: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.college || !formData.content) {
            toast.error(t("fill.all.fields"));
            return;
        }

        const message = `*Student Feedback*%0A%0A*Name:* ${formData.name}%0A*College:* ${formData.college}%0A*Feedback:* ${formData.content}`;
        const phoneNumber = "919042427828"; // Zenetive Infotech Number
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

        window.open(whatsappUrl, "_blank");
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 py-8 max-w-md">
                <h1 className="text-3xl font-bold mb-2">{t("feedback.title")}</h1>
                <p className="text-muted-foreground mb-8">{t("feedback.subtitle")}</p>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("name")}</Label>
                            <Input
                                id="name"
                                placeholder={t("name")}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="college">{t("college.name")}</Label>
                            <Input
                                id="college"
                                placeholder={t("college.name")}
                                value={formData.college}
                                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">{t("feedback.content")}</Label>
                            <Textarea
                                id="content"
                                placeholder={t("feedback.content")}
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="min-h-[120px]"
                            />
                        </div>

                        <Button type="submit" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            {t("send.whatsapp")}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Feedback;
