import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Plus, Pencil, Upload, User, Calendar, Trash2 } from "lucide-react";
import { updateProfile, uploadPresenterAvatar, deletePresenter } from "@/services/profiles";
import { getPresentationsByPresenter } from "@/services/presentations";
import { Link } from "react-router-dom";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profileName";
import { formatShortDate } from "@/lib/dateUtils";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Presentation = Database["public"]["Tables"]["presentations"]["Row"];

interface PresenterManagementProps {
  presenters: Profile[];
  allProfiles: Profile[];
  onPresentersChange: () => void;
}

const PresenterManagement = ({ presenters, allProfiles, onPresentersChange }: PresenterManagementProps) => {
  const { t, language } = useLanguage();
  
  // Edit presenter state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPresenter, setEditingPresenter] = useState<Profile | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Presentations view state
  const [viewingPresentations, setViewingPresentations] = useState<Profile | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(false);

  // Delete presenter state
  const [presenterToDelete, setPresenterToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhotoFile(file);
      setEditPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleEditPresenter = (presenter: Profile) => {
    setEditingPresenter(presenter);
    setEditFirstName(presenter.first_name || "");
    setEditLastName(presenter.last_name || "");
    setEditBio(presenter.bio || "");
    setEditPhotoPreview(presenter.avatar_url);
    setEditPhotoFile(null);
    setIsEditOpen(true);
  };

  const handleUpdatePresenter = async () => {
    if (!editingPresenter) return;

    setIsSubmitting(true);

    let avatarUrl = editingPresenter.avatar_url;
    
    if (editPhotoFile) {
      const { url, error: uploadError } = await uploadPresenterAvatar(editPhotoFile, editingPresenter.id);
      if (!uploadError && url) {
        avatarUrl = url;
      }
    }

    const { error } = await updateProfile(editingPresenter.id, {
      first_name: editFirstName,
      last_name: editLastName,
      bio: editBio || null,
      avatar_url: avatarUrl,
    });

    if (error) {
      toast.error(t.auth.error);
    } else {
      toast.success(t.admin.presenterUpdated);
      setIsEditOpen(false);
      setEditingPresenter(null);
      onPresentersChange();
    }

    setIsSubmitting(false);
  };

  const handleViewPresentations = async (presenter: Profile) => {
    setViewingPresentations(presenter);
    setLoadingPresentations(true);
    
    const { data } = await getPresentationsByPresenter(presenter.id);
    setPresentations(data || []);
    setLoadingPresentations(false);
  };

  const handleDeletePresenter = async () => {
    if (!presenterToDelete) return;
    
    setIsDeleting(true);
    const { error } = await deletePresenter(presenterToDelete.id);
    
    if (error) {
      toast.error(t.admin.errors.deleteError);
    } else {
      toast.success(t.admin.presenterDeleted);
      onPresentersChange();
    }
    
    setIsDeleting(false);
    setPresenterToDelete(null);
  };

  // Get profiles that could be marked as presenters
  const linkableProfiles = allProfiles.filter(p => !p.is_presenter);

  const handleMarkAsPresenter = async (profileId: string) => {
    const { error } = await updateProfile(profileId, { is_presenter: true });
    if (error) {
      toast.error(t.auth.error);
    } else {
      toast.success(t.admin.presenterCreated);
      onPresentersChange();
    }
  };

  return (
    <motion.div
      key="presenters"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-serif text-xl">{t.admin.presenters}</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="nightBlue" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.createPresenter}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.admin.createPresenter}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {t.admin.addPresenterDescription}
              </p>
              
              {linkableProfiles.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t.admin.noMemberAvailable}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {linkableProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={getProfileDisplayName(profile)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{getProfileDisplayName(profile)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsPresenter(profile.id)}
                      >
                        {language === "fr" ? "Ajouter" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.admin.editPresenter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Photo upload */}
            <div className="space-y-2">
              <Label>{t.admin.photo}</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <span className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="w-4 h-4" />
                    {editingPresenter?.avatar_url ? t.admin.changePhoto : t.admin.uploadPhoto}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.firstName}</Label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.lastName}</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.admin.bio}</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              variant="nightBlue"
              className="w-full"
              onClick={handleUpdatePresenter}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.common.loading : t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Presentations Dialog */}
      <Dialog open={!!viewingPresentations} onOpenChange={() => setViewingPresentations(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t.admin.presentations} - {getProfileDisplayName(viewingPresentations)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {loadingPresentations ? (
              <p className="text-muted-foreground">{t.common.loading}</p>
            ) : presentations.length === 0 ? (
              <p className="text-muted-foreground">{t.admin.noPresentations}</p>
            ) : (
              <div className="space-y-3">
                {presentations.map((presentation) => (
                  <div
                    key={presentation.id}
                    className="p-3 border border-border rounded-lg"
                  >
                    <p className="font-serif">{presentation.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatShortDate(presentation.presentation_date, language)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!presenterToDelete} onOpenChange={(open) => !open && setPresenterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "fr" ? "Supprimer l'intervenant ?" : "Delete presenter?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? `Êtes-vous sûr de vouloir supprimer ${getProfileDisplayName(presenterToDelete)} de la liste des intervenants ? Cette action retirera le statut d'intervenant mais conservera le profil.`
                : `Are you sure you want to remove ${getProfileDisplayName(presenterToDelete)} from the presenters list? This action will remove the presenter status but keep the profile.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePresenter}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t.admin.deleting : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Presenters list */}
      {presenters.length === 0 ? (
        <p className="text-muted-foreground">{t.admin.noPresenters}</p>
      ) : (
        <div className="space-y-2">
          {presenters.map((presenter) => (
            <div
              key={presenter.id}
              className="flex items-center justify-between py-4 px-4 border border-border bg-muted/30"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {presenter.avatar_url ? (
                    <img
                      src={presenter.avatar_url}
                      alt={getProfileDisplayName(presenter)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-serif text-muted-foreground">
                      {getProfileInitials(presenter)}
                    </span>
                  )}
                </div>
                <div>
                  <Link 
                    to={`/presentateur/${presenter.id}`}
                    className="font-serif text-lg hover:text-primary transition-colors"
                  >
                    {getProfileDisplayName(presenter)}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {presenter.bio?.slice(0, 60) || (language === "fr" ? "Aucune bio" : "No bio")}
                    {presenter.bio && presenter.bio.length > 60 ? "..." : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewPresentations(presenter)}
                  title={t.admin.presentations}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPresenter(presenter)}
                  title={t.common.edit}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPresenterToDelete(presenter)}
                  className="text-destructive hover:text-destructive"
                  title={t.common.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PresenterManagement;
