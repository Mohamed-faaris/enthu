import { Card } from "@enthu/ui/components/card";

export function EventCard({ name, category, gender, eventType }: { name: string; category: string; gender: string; eventType: string }) {
  return (
    <Card className="p-4">
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-muted-foreground">
        {category} • {gender} • {eventType}
      </p>
    </Card>
  );
}
