import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedbackItem {
  mistake: string;
  correction: string;
  logic: string;
}

interface FeedbackTableProps {
  items: FeedbackItem[];
}

export function FeedbackTable({ items }: FeedbackTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No errors found. Great work!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50">
            <TableHead className="font-semibold text-foreground">Mistake</TableHead>
            <TableHead className="font-semibold text-foreground">Correction</TableHead>
            <TableHead className="font-semibold text-foreground">Explanation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index} className="hover:bg-secondary/30 transition-colors">
              <TableCell className="text-destructive font-medium">
                {item.mistake}
              </TableCell>
              <TableCell className="text-success font-medium">
                {item.correction}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {item.logic}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
