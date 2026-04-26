import { useState } from "react";
import { Clipboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TestSessionControlsProps {
  testId: string | null;
  title?: string | null;
  onLoad: (id: string) => void;
}

export function TestSessionControls({ testId, title, onLoad }: TestSessionControlsProps) {
  const [loadId, setLoadId] = useState("");

  const copyId = async () => {
    if (!testId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("test", testId);
    await navigator.clipboard.writeText(url.toString());
    toast.success("Test link copied");
  };

  const handleLoad = () => {
    const id = loadId.trim();
    if (!id) return;
    onLoad(id);
    setLoadId("");
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Current test</span>
          {testId ? <Badge variant="secondary" className="font-mono text-[10px]">{testId}</Badge> : <Badge variant="outline">No ID yet</Badge>}
        </div>
        {title && <p className="mt-1 truncate text-sm font-medium text-foreground">{title}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <Input
            value={loadId}
            onChange={(e) => setLoadId(e.target.value)}
            placeholder="Paste test ID"
            className="h-9 w-full sm:w-44 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleLoad} className="gap-1">
            <Search className="h-4 w-4" />
            Load
          </Button>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={copyId} disabled={!testId} className="gap-1">
          <Clipboard className="h-4 w-4" />
          Copy ID
        </Button>
      </div>
    </div>
  );
}
