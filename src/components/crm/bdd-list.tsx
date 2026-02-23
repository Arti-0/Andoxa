"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, List, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export interface BddItem {
  id: string;
  name: string;
  source: string;
  created_at: string | null;
}

interface BddApiResponse {
  items: BddItem[];
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin_extension: "LinkedIn",
  linkedin: "LinkedIn",
  csv: "Import CSV",
  import: "Import",
  manual: "Manuel",
  website: "Site web",
};

async function fetchBdd(): Promise<BddApiResponse> {
  const res = await fetch("/api/bdd", { credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return { items: json.items ?? [] };
}

interface BddListProps {
  workspaceId: string | null;
  onSelectList: (bddId: string | null) => void;
  search?: string;
}

export function BddList({ workspaceId, onSelectList, search = "" }: BddListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["bdd", workspaceId],
    queryFn: fetchBdd,
    enabled: !!workspaceId,
  });

  const allItems = data?.items ?? [];
  const searchLower = search.trim().toLowerCase();
  const items = searchLower
    ? allItems.filter((item) => item.name.toLowerCase().includes(searchLower))
    : allItems;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Liste</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Liste</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Tous les prospects */}
          <TableRow
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelectList(null)}
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Tous les prospects
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </TableCell>
          </TableRow>

          {/* Listes BDD */}
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectList(item.id)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  {item.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {SOURCE_LABELS[item.source] ?? item.source}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.created_at ? formatDate(item.created_at) : "—"}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}

          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="border-t py-12 text-center text-sm text-muted-foreground"
              >
                Aucune liste. Importez des prospects depuis l&apos;extension pour créer une liste.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
