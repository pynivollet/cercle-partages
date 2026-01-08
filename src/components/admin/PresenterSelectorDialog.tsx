import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, X, Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { getProfileDisplayName } from "@/lib/profileName";
import { useLanguage } from "@/i18n/LanguageContext";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PresenterSelectorDialogProps {
  presenters: Profile[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onPresenterCreated?: (presenter: Profile) => void;
}

const PresenterSelectorDialog = ({
  presenters,
  selectedIds,
  onSelectionChange,
}: PresenterSelectorDialogProps) => {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPresenters = presenters.filter((presenter) => {
    const name = getProfileDisplayName(presenter).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedPresenters = presenters.filter((p) => selectedIds.includes(p.id));

  const handlePresenterToggle = (presenterId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, presenterId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== presenterId));
    }
  };

  const handleRemovePresenter = (presenterId: string) => {
    onSelectionChange(selectedIds.filter((id) => id !== presenterId));
  };

  return (
    <div className="space-y-2">
      {/* Selected presenters display */}
      {selectedPresenters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedPresenters.map((presenter) => (
            <Badge key={presenter.id} variant="secondary" className="flex items-center gap-1 pr-1">
              {getProfileDisplayName(presenter)}
              <button
                type="button"
                onClick={() => handleRemovePresenter(presenter.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            {selectedIds.length > 0
              ? language === "fr" 
                ? `${selectedIds.length} intervenant${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}`
                : `${selectedIds.length} presenter${selectedIds.length > 1 ? "s" : ""} selected`
              : language === "fr" ? "Sélectionner des intervenants" : "Select presenters"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "fr" ? "Sélectionner des intervenants" : "Select presenters"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "fr" ? "Rechercher un intervenant..." : "Search for a presenter..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Presenter list */}
            <ScrollArea className="h-[300px] border border-border rounded-md">
              <div className="p-3 space-y-2">
                {filteredPresenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery 
                      ? (language === "fr" ? "Aucun résultat" : "No results") 
                      : (language === "fr" ? "Aucun intervenant disponible" : "No presenters available")}
                  </p>
                ) : (
                  filteredPresenters.map((presenter) => (
                    <div
                      key={presenter.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`dialog-presenter-${presenter.id}`}
                        checked={selectedIds.includes(presenter.id)}
                        onCheckedChange={(checked) =>
                          handlePresenterToggle(presenter.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`dialog-presenter-${presenter.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-sm">
                          {getProfileDisplayName(presenter)}
                        </div>
                        {presenter.bio && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {presenter.bio}
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} {language === "fr" ? `sélectionné${selectedIds.length > 1 ? "s" : ""}` : "selected"}
              </span>
              <Button type="button" onClick={() => setOpen(false)}>
                {t.common.confirm}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresenterSelectorDialog;
