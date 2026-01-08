import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Mail, RefreshCw, Search, Check, Clock, UserX, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Database } from "@/integrations/supabase/types";
import { getProfileDisplayName } from "@/lib/profileName";

type AppRole = Database["public"]["Enums"]["app_role"];

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
  is_presenter: boolean;
  invitation_accepted: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserManagementProps {
  onUsersLoaded?: (users: User[]) => void;
}

const UserManagement = ({ onUsersLoaded }: UserManagementProps) => {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "accepted" | "pending">("all");

  // Invitation form state
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<AppRole>("participant");
  const [isInviting, setIsInviting] = useState(false);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  // Delete user state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in: don't call the admin-only edge function.
        setUsers([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke("get-users");

      if (error) {
        console.error("Error fetching users:", error);
        toast.error(t.admin.errors.loadingUsers);
      } else if (data?.users) {
        setUsers(data.users);
        onUsersLoaded?.(data.users);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error(t.admin.errors.loadingUsers);
    } finally {
      setIsLoading(false);
    }
  }, [onUsersLoaded]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateInvitation = async () => {
    if (!newInviteEmail) {
      toast.error(t.admin.errors.emailRequired);
      return;
    }

    setIsInviting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(t.admin.errors.sessionExpired);
        return;
      }

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: newInviteEmail,
          role: newInviteRole,
        },
      });

      if (error) {
        console.error("Invitation error:", error);
        toast.error(t.admin.errors.invitationError);
      } else {
        toast.success(t.admin.invitationSentTo.replace("{email}", newInviteEmail));
        setIsCreateInviteOpen(false);
        setNewInviteEmail("");
        setNewInviteRole("participant");
        // Refresh user list
        fetchUsers();
      }
    } catch (err) {
      console.error("Invitation error:", err);
      toast.error(t.admin.errors.invitationError);
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (user: User) => {
    setResendingUserId(user.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(t.admin.errors.sessionExpired);
        setResendingUserId(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: user.email,
          role: user.roles[0] || "participant",
        },
      });

      if (error) {
        console.error("Resend invitation error:", error);
        toast.error(t.admin.errors.resendError);
      } else {
        toast.success(t.admin.invitationResentTo.replace("{email}", user.email));
      }
    } catch (err) {
      console.error("Resend invitation error:", err);
      toast.error(t.admin.errors.resendError);
    } finally {
      setResendingUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: userToDelete.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t.admin.userDeleted.replace("{email}", userToDelete.email));
        setUserToDelete(null);
        fetchUsers();
      } else {
        throw new Error(data?.error || "Erreur inconnue");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      toast.error(t.admin.errors.deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "presenter":
        return t.admin.presenters.slice(0, -1); // Remove 's' for singular if possible, or just use the key
      case "participant":
        return "Participant";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "presenter":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.last_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "accepted" && user.invitation_accepted) ||
      (statusFilter === "pending" && !user.invitation_accepted);

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="font-serif text-xl">{t.admin.users}</h2>
        <Dialog open={isCreateInviteOpen} onOpenChange={setIsCreateInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="nightBlue" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.createInvitation}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.admin.createInvitation}</DialogTitle>
              <DialogDescription>{language === "fr" ? "Un email d'invitation sera envoyé à l'adresse indiquée." : "An invitation email will be sent to the specified address."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t.auth.email}</Label>
                <Input
                  type="email"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.role}</Label>
                <Select value={newInviteRole} onValueChange={(v) => setNewInviteRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="presenter">{t.admin.presenters.slice(0, -1)}</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="nightBlue"
                className="w-full"
                onClick={handleCreateInvitation}
                disabled={isInviting || !newInviteEmail}
              >
                <Mail className="w-4 h-4 mr-2" />
                {isInviting ? t.admin.sendingInvitation : t.admin.sendInvitation}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.admin.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "accepted" | "pending")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.admin.filterByStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.admin.allStatus}</SelectItem>
            <SelectItem value="accepted">{t.admin.registrationValidated}</SelectItem>
            <SelectItem value="pending">{t.admin.pending}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center border border-border/50 rounded-lg bg-muted/20">
          <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? t.admin.noUserFound
              : t.admin.noUsers}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.user}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.admin.role}</TableHead>
                <TableHead className="hidden md:table-cell">{t.admin.registeredAt}</TableHead>
                <TableHead>{t.admin.status}</TableHead>
                <TableHead className="text-right">{t.admin.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {getProfileDisplayName({
                          first_name: user.first_name,
                          last_name: user.last_name,
                        }) || "—"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{user.email}</p>
                      {/* Show role on mobile */}
                      <div className="sm:hidden mt-1 flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                        {user.is_presenter && (
                          <Badge variant="secondary" className="text-xs">
                            {t.admin.presenters.slice(0, -1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                      {user.is_presenter && <Badge variant="secondary">{t.admin.presenters.slice(0, -1)}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    {user.invitation_accepted ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">{language === "fr" ? "Validé" : "Validated"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">{t.admin.pending}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!user.invitation_accepted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvitation(user)}
                          disabled={resendingUserId === user.id}
                          title={t.admin.resendInvitation}
                        >
                          <RefreshCw className={`w-4 h-4 ${resendingUserId === user.id ? "animate-spin" : ""}`} />
                          <span className="ml-2 hidden sm:inline">
                            {resendingUserId === user.id ? t.admin.resending : t.admin.resend}
                          </span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToDelete(user)}
                        title={t.admin.deleteUser}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-4">
        {filteredUsers.length} {t.admin.user.toLowerCase()}{filteredUsers.length > 1 ? "s" : ""}
        {statusFilter !== "all" && (language === "fr" ? ` (filtrés sur ${users.length} au total)` : ` (filtered from ${users.length} total)`)}
      </p>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.deleteUserTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.deleteUserDescription.replace("{email}", userToDelete?.email || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t.admin.deleting : t.admin.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
