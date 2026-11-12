"use client";

import { KeyRound, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import { usersApi } from "@/features/users/api";
import { ResetPasswordModal, UserFormModal } from "@/features/users/UserForm";
import { useDebounced } from "@/hooks/useDebounced";
import { useQuery } from "@/hooks/useQuery";
import { ROLE_LABELS, timeAgo } from "@/lib/format";
import type { Role, User } from "@/lib/types";

const ROLE_TONES: Record<Role, "brand" | "warning" | "neutral"> = { super_admin: "warning", admin: "brand", marketing: "neutral" };

export default function UsersPage() {
  const toast = useToast();
  const { user: me, can } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debounced = useDebounced(search);
  const { data, error, loading, reload } = useQuery((signal) => usersApi.list({ search: debounced, role }, signal), [debounced, role]);

  const manage = can("users:manage");
  // Super admin accounts can only be managed by a super admin.
  const editable = (u: User) => manage && (u.role !== "super_admin" || me.role === "super_admin");

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await usersApi.remove(toDelete.id);
      toast.success("Utilisateur supprimé");
      setToDelete(null);
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RequirePermission permissions={["users:read"]}>
      <PageHeader
        eyebrow="Administration"
        title={<>Utilisateurs du <em>backoffice</em></>}
        description="Créez les comptes de l'équipe, attribuez un rôle et désactivez un accès à tout moment."
        actions={
          manage && (
            <Button
              size="sm"
              icon={<UserPlus size={15} aria-hidden />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Nouvel utilisateur
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" value={search} placeholder="Rechercher par nom ou e-mail…" aria-label="Rechercher un utilisateur" className="pl-10" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={role} aria-label="Filtrer par rôle" className="w-auto! min-w-[200px]" onChange={(e) => setRole(e.target.value as Role | "")}>
          <option value="">Tous les rôles</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<Users size={24} aria-hidden />} title="Aucun utilisateur ne correspond" text="Modifiez votre recherche ou le filtre de rôle." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Utilisateur</Th>
              <Th>Rôle</Th>
              <Th>État</Th>
              <Th>Dernière connexion</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => {
              const self = u.id === me.id;
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky text-sm font-bold text-brand-deep" aria-hidden>
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-navy">
                          {u.name} {self && <span className="font-normal text-muted">(vous)</span>}
                        </span>
                        <span className="block truncate text-[13px] text-muted">{u.email}</span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={u.active ? "success" : "neutral"} dot>
                      {u.active ? "Actif" : "Désactivé"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Jamais"}</Td>
                  <Td>
                    <div className="flex justify-end gap-0.5">
                      {editable(u) && (
                        <>
                          <IconButton
                            label={`Modifier ${u.name}`}
                            onClick={() => {
                              setEditing(u);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil size={15} aria-hidden />
                          </IconButton>
                          {!self && (
                            <>
                              <IconButton label={`Réinitialiser le mot de passe de ${u.name}`} onClick={() => setResetting(u)}>
                                <KeyRound size={15} aria-hidden />
                              </IconButton>
                              <IconButton label={`Supprimer ${u.name}`} tone="danger" onClick={() => setToDelete(u)}>
                                <Trash2 size={15} aria-hidden />
                              </IconButton>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <UserFormModal open={formOpen} user={editing} onClose={() => setFormOpen(false)} onSaved={() => void reload()} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet utilisateur ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setToDelete(null)}
        message={
          <>
            Le compte de <strong>{toDelete?.name}</strong> sera définitivement supprimé. Pour suspendre l’accès sans supprimer le compte, désactivez-le.
          </>
        }
      />
    </RequirePermission>
  );
}
