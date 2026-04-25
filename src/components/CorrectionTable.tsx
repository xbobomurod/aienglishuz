import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CorrectionItem {
  mistake: string;
  correction: string;
  logic?: string;
  explanation?: string;
}

interface CorrectionTableProps {
  items: CorrectionItem[];
  title?: string;
}

export function CorrectionTable({ items, title = "Correction Table" }: CorrectionTableProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">✅ {title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Excellent! No corrections needed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">📝 {title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Mistake</TableHead>
              <TableHead className="w-[30%]">Correction</TableHead>
              <TableHead className="w-[40%]">Examiner Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Badge variant="destructive" className="font-mono text-xs line-through whitespace-normal h-auto py-1">
                    {item.mistake}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-success/10 text-success border-success/30 font-mono text-xs whitespace-normal h-auto py-1">
                    {item.correction}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.logic || item.explanation || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
