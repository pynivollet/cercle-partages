import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, X, Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { createPresenterProfile } from "@/services/profiles";
import { toast } from "sonner";

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
  onPresenterCreated,
}: PresenterSelectorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("select");
  
  // New presenter form state
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBio, setNewBio] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredPresenters = presenters.filter((presenter) => {
    const fullName = `${presenter.first_name || ""} ${presenter.last_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
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

  const handleCreatePresenter = async () => {
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await createPresenterProfile({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        bio: newBio.trim() || undefined,
      });

      if (error) throw error;
      if (data) {
        toast.success("Intervenant créé avec succès");
        onPresenterCreated?.(data);
        onSelectionChange([...selectedIds, data.id]);
        
        // Reset form
        setNewFirstName("");
        setNewLastName("");
        setNewEmail("");
        setNewBio("");
        setActiveTab("select");
      }
    } catch (error) {
      console.error("Error creating presenter:", error);
      toast.error("Erreur lors de la création de l'intervenant");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Intervenants</Label>
      
      {/* Selected presenters display */}
      {selectedPresenters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedPresenters.map((presenter) => (
            <Badge key={presenter.id} variant="secondary" className="flex items-center gap-1 pr-1">
              {presenter.first_name} {presenter.last_name}
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
              ? `${selectedIds.length} intervenant${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}`
              : "Sélectionner des intervenants"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestion des intervenants</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Sélectionner
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Créer nouveau
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="mt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un intervenant..."
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
                      {searchQuery ? "Aucun résultat" : "Aucun intervenant disponible"}
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
                            {presenter.first_name} {presenter.last_name}
                          </div>
                          {presenter.professional_background && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {presenter.professional_background}
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
                  {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
                </span>
                <Button type="button" onClick={() => setOpen(false)}>
                  Confirmer
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="create" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-first-name">Prénom *</Label>
                  <Input
                    id="new-first-name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-last-name">Nom *</Label>
                  <Input
                    id="new-last-name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-bio">Biographie</Label>
                <Textarea
                  id="new-bio"
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Courte biographie..."
                  rows={3}
                />
              </div>

              <Button
                type="button"
                onClick={handleCreatePresenter}
                disabled={isCreating || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()}
                className="w-full"
              >
                {isCreating ? "Création..." : "Créer et sélectionner"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresenterSelectorDialog;
