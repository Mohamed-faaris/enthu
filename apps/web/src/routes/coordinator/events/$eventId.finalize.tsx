import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { toast } from "sonner";

export const Route = createFileRoute("/coordinator/events/$eventId/finalize")({
  component: FinalizePage,
});

function FinalizePage() {
  const { eventId } = Route.useParams();
  const [reason, setReason] = useState("");
  const mut = useMutation(
    trpc.results.finalize.mutationOptions({
      onSuccess: (r) => toast.success(`Finalized ${r.finalized} results`),
      onError: (e) => toast.error(e.message),
    })
  );
  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-medium">Finalize Results</h2>
      <p className="text-sm text-muted-foreground">Assign rank/points and mark isFinal. Only organizer (admin) can finalize; coordinators use scoreboard to edit raw values.</p>
      <Button onClick={() => mut.mutate({ eventId, entries: [], reason })} disabled={mut.isPending}>
        Finalize (stub)
      </Button>
    </div>
  );
}
