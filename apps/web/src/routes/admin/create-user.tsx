import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "school_spoc", label: "School SPOC" },
  { value: "certificate_writer", label: "Certificate Writer" },
  { value: "event_coordinator", label: "Event Coordinator" },
  { value: "result_announcer", label: "Result Announcer" },
] as const;

const selectClass =
  "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export const Route = createFileRoute("/admin/create-user")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(trpc.users.list.queryOptions()),
      context.queryClient.ensureQueryData(trpc.schools.publicList.queryOptions()),
    ]),
  component: CreateUserPage,
});

type UserRow = { id: string; name: string; email: string; role: string; school: { name: string } | null };

function CreateUserPage() {
  const qc = useQueryClient();
  const usersQ = useQuery(trpc.users.list.queryOptions());
  const schoolsQ = useQuery(trpc.schools.publicList.queryOptions());
  const users = (usersQ.data as unknown as UserRow[] | undefined) ?? [];
  const schools = (schoolsQ.data as unknown as Array<{ id: string; name: string }> | undefined) ?? [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "school_spoc", schoolId: "" });

  const create = useMutation(
    trpc.users.createUser.mutationOptions({
      onSuccess: async () => {
        toast.success("User created");
        setOpen(false);
        setForm({ name: "", email: "", password: "", role: "school_spoc", schoolId: "" });
        await qc.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const [pwOpen, setPwOpen] = useState(false);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [pw, setPw] = useState("");

  const changePw = useMutation(
    trpc.users.setPassword.mutationOptions({
      onSuccess: async () => {
        toast.success("Password updated");
        setPwOpen(false);
        setPw("");
        setPwUser(null);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "school_spoc", schoolId: "" });
    setOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role as (typeof ROLES)[number]["value"],
      schoolId: form.role === "school_spoc" && form.schoolId ? form.schoolId : null,
    } as never);
  };

  const openPw = (row: UserRow) => {
    setPwUser(row);
    setPw("");
    setPwOpen(true);
  };

  const handlePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwUser) return;
    changePw.mutate({ userId: pwUser.id, password: pw } as never);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Create users</h2>
          <p className="text-sm text-muted-foreground">Create login users with a role and custom password, or reset an existing user's password.</p>
        </div>
        <Button onClick={openCreate}>Add user</Button>
      </div>

      <DataTable
        data={users as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as UserRow).name },
          { header: "Email", cell: (r) => (r as unknown as UserRow).email },
          { header: "Role", cell: (r) => (r as unknown as UserRow).role },
          { header: "School", cell: (r) => (r as unknown as UserRow).school?.name ?? "—" },
          {
            header: "Actions",
            cell: (r) => {
              const row = r as unknown as UserRow;
              return (
                <Button size="sm" variant="outline" onClick={() => openPw(row)}>
                  Change password
                </Button>
              );
            },
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Assign a role and set an initial password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select id="role" className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {form.role === "school_spoc" && (
            <div className="space-y-1">
              <Label htmlFor="school">School</Label>
              <select id="school" className={selectClass} value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}>
                <option value="">— No school —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create user
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Set a new password for {pwUser ? `${pwUser.name} (${pwUser.email})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePw} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={changePw.isPending}>
              Update password
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
