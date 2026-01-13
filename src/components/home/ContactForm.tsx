import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, CheckCircle } from "lucide-react";

type ContactReason = 
  | "connexion_issue"
  | "intervention_request"
  | "general_remark"
  | "membership_request"
  | "other";

const ContactForm = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [reason, setReason] = useState<ContactReason | "">("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason || !message.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          reason,
          message: message.trim(),
          senderEmail: user?.email || "Anonyme",
          senderName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Membre",
        },
      });

      if (error) throw error;

      setShowSuccess(true);
      setReason("");
      setMessage("");
    } catch (error) {
      console.error("Error sending contact email:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="section-padding bg-muted/30">
      <div className="editorial-container">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl mb-4 text-center">
            {t.contact.title}
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            {t.contact.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason">{t.contact.reasonLabel}</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as ContactReason)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t.contact.reasonPlaceholder} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="connexion_issue">{t.contact.reasons.connexionIssue}</SelectItem>
                  <SelectItem value="intervention_request">{t.contact.reasons.interventionRequest}</SelectItem>
                  <SelectItem value="general_remark">{t.contact.reasons.generalRemark}</SelectItem>
                  <SelectItem value="membership_request">{t.contact.reasons.membershipRequest}</SelectItem>
                  <SelectItem value="other">{t.contact.reasons.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t.contact.messageLabel}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.contact.messagePlaceholder}
                rows={5}
                className="resize-none"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={!reason || !message.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                t.contact.sending
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t.contact.submit}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">{t.contact.successTitle}</DialogTitle>
            <DialogDescription className="text-center">
              {t.contact.successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowSuccess(false)}>
              {t.common.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContactForm;
