import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@enthu/ui/components/card";
import { Button } from "@enthu/ui/components/button";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});



function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-8">
     
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Enthusia Portal</h1>
        <p className="text-sm text-muted-foreground">Choose your login — Admin or School (school code sent to your school)</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <p className="text-xs text-muted-foreground">Manage schools, events, registrations, categories</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Sign in with admin email and password</p>
            <Link to="/login" className="mt-auto">
              <Button className="w-full">Go to Admin Login →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>School Login</CardTitle>
            <p className="text-xs text-muted-foreground">Select school name + code sent to you</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Dropdown with all schools + code, registrations like admin schools level (school fixed)</p>
            <Link to="/school-login" className="mt-auto">
              <Button className="w-full" variant="secondary">Go to School Login →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`} />
          <span>API {healthCheck.isLoading ? "checking..." : healthCheck.data ? "connected" : "disconnected"}</span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">School registrations mirror admin schools level — per-event tables with + Add, student/team auto-created inline, school fixed</p>
    </div>
  );
}
