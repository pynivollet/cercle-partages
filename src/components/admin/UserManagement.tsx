import { useState, useEffect } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Mail, RefreshCw, Search, Check, Clock, UserX } from "lucide-react";
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
  const { t } = useLanguage();
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

  const fetchUsers = async () => {
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

      const invoke = async (accessToken: string) => supabase.functions.invoke("get-users");

      let { data, error } = await invoke(session.access_token);

      // If token is stale/rotated, refresh once and retry.
      if (error && (error as any)?.status === 401 && (error as any)?.message?.includes("Invalid JWT")) {
        const refreshed = await supabase.auth.refreshSession();
        const newToken = refreshed.data.session?.access_token;
        if (newToken) {
          ({ data, error } = await invoke(newToken));
        }
      }

      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Erreur lors du chargement des utilisateurs");
      } else if (data?.users) {
        setUsers(data.users);
        onUsersLoaded?.(data.users);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateInvitation = async () => {
    if (!newInviteEmail) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setIsInviting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expirée, veuillez vous reconnecter");
        return;
      }

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: newInviteEmail,
          role: newInviteRole,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Invitation error:", error);
        toast.error("Erreur lors de l'envoi de l'invitation");
      } else {
        toast.success(`Invitation envoyée à ${newInviteEmail}`);
        setIsCreateInviteOpen(false);
        setNewInviteEmail("");
        setNewInviteRole("participant");
        // Refresh user list
        fetchUsers();
      }
    } catch (err) {
      console.error("Invitation error:", err);
      toast.error("Erreur lors de l'envoi de l'invitation");
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
        toast.error("Session expirée, veuillez vous reconnecter");
        setResendingUserId(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: user.email,
          role: user.roles[0] || "participant",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Resend invitation error:", error);
        toast.error("Erreur lors du renvoi de l'invitation");
      } else {
        toast.success(`Invitation renvoyée à ${user.email}`);
      }
    } catch (err) {
      console.error("Resend invitation error:", err);
      toast.error("Erreur lors du renvoi de l'invitation");
    } finally {
      setResendingUserId(null);
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "presenter":
        return "Présentateur";
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
    return new Date(dateString).toLocaleDateString("fr-FR", {
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
        <h2 className="font-serif text-xl">Utilisateurs</h2>
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
              <DialogDescription>Un email d'invitation sera envoyé à l'adresse indiquée.</DialogDescription>
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
                    <SelectItem value="presenter">Présentateur</SelectItem>
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
                {isInviting ? "Envoi en cours..." : "Envoyer l'invitation"}
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
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "accepted" | "pending")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="accepted">Inscription validée</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
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
              ? "Aucun utilisateur ne correspond à votre recherche"
              : "Aucun utilisateur"}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden sm:table-cell">Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                            Intervenant
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
                      {user.is_presenter && <Badge variant="secondary">Intervenant</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    {user.invitation_accepted ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">Validé</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">En attente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!user.invitation_accepted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvitation(user)}
                        disabled={resendingUserId === user.id}
                        title="Renvoyer l'invitation"
                      >
                        <RefreshCw className={`w-4 h-4 ${resendingUserId === user.id ? "animate-spin" : ""}`} />
                        <span className="ml-2 hidden sm:inline">
                          {resendingUserId === user.id ? "Envoi..." : "Renvoyer"}
                        </span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-4">
        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
        {statusFilter !== "all" && ` (filtrés sur ${users.length} au total)`}
      </p>
    </div>
  );
};

export default UserManagement;
