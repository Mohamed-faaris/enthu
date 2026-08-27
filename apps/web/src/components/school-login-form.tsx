import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Card, CardHeader, CardTitle, CardContent } from "@enthu/ui/components/card";

export function SchoolLoginForm() {
  const navigate = useNavigate();
  const schoolsQ = useQuery(trpc.schools.publicList.queryOptions());
  const [schoolId, setSchoolId] = useState("");
  const [code, setCode] = useState("");

  const verify = useMutation(
    trpc.schools.verifyCode.mutationOptions({
      onSuccess: async (data) => {
        localStorage.setItem("schoolId", data.schoolId);
        localStorage.setItem("schoolName", data.schoolName);
        // create proper better-auth session so protected school routes work
        const email = (data as any).email as string;
        const res = await authClient.signIn.email(
          { email, password: code.trim() },
          {
            onSuccess: () => {},
            onError: (err) => {
              // if signIn fails, still allow localStorage fallback
              console.warn("school signIn failed", err);
            },
          }
        );
        toast.success(`Welcome ${data.schoolName}`);
        navigate({ to: "/school/registrations" });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return toast.error("Select school");
    if (!code.trim()) return toast.error("Enter code sent to school");
    verify.mutate({ schoolId, code: code.trim() });
  };

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-base">School Login</CardTitle>
        <p className="text-xs text-muted-foreground">Select your school and enter the code sent to you</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>School *</Label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">— select school —</option>
              {(schoolsQ.data as unknown as Array<{ id: string; name: string }> | undefined)?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {schoolsQ.isLoading && <p className="text-xs text-muted-foreground">Loading schools…</p>}
          </div>
          <div className="space-y-2">
            <Label>School Code *</Label>
            <Input
              type="password"
              placeholder="Code sent to school"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Use the code shared with your school (school.code)</p>
          </div>
          <Button type="submit" className="w-full" disabled={verify.isPending || !schoolId || !code}>
            {verify.isPending ? "Verifying…" : "Login as School"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
