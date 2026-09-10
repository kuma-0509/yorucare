import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import type {
  RecordsTableColumn,
  RecordsTableRow,
} from "@/lib/records-table";
import { cn } from "@/lib/utils";

const COLUMN_MIN_WIDTH: Record<string, string> = {
  mood: "min-w-[5.5rem]",
  moodLabels: "min-w-[7rem]",
  sleep: "min-w-[11rem]",
  medication: "min-w-[7rem]",
  warning: "min-w-[8rem]",
  doneToday: "min-w-[8rem]",
  notToDo: "min-w-[8rem]",
  memo: "min-w-[12rem]",
};

interface RecordsTableProps {
  columns: RecordsTableColumn[];
  rows: RecordsTableRow[];
  canEditDate: (date: string) => boolean;
  onViewDetail: (date: string) => void;
  onEdit: (date: string) => void;
  onAdd: (date: string) => void;
}

export function RecordsTable({
  columns,
  rows,
  canEditDate,
  onViewDetail,
  onEdit,
  onAdd,
}: RecordsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{COPY.recordsList.caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 min-w-[9.5rem] border-b border-r border-border bg-muted px-3 py-2.5 text-left font-semibold shadow-[2px_0_6px_rgba(45,55,72,0.06)]"
            >
              {COPY.recordsList.date}
            </th>
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "border-b border-border bg-muted px-3 py-2.5 text-left font-semibold",
                  index < columns.length - 1 && "border-r",
                  COLUMN_MIN_WIDTH[column.key]
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const canEdit = canEditDate(row.date);
            const rowBg =
              row.kind === "filled" ? "bg-card" : "bg-muted/50";

            return (
              <tr key={row.date}>
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-border px-3 py-2.5 text-left align-top font-medium shadow-[2px_0_6px_rgba(45,55,72,0.06)]",
                    rowBg
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <span className="whitespace-nowrap">{row.displayDate}</span>
                    <div className="flex flex-col gap-1">
                      {row.kind === "missing" ? (
                        canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto w-full whitespace-normal py-2 leading-snug"
                            onClick={() => onAdd(row.date)}
                          >
                            {COPY.recordsList.addRecord}
                          </Button>
                        )
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto w-full whitespace-normal py-2 leading-snug"
                            onClick={() => onViewDetail(row.date)}
                          >
                            {COPY.recordsList.viewDetail}
                          </Button>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-auto w-full whitespace-normal py-2 leading-snug"
                              onClick={() => onEdit(row.date)}
                            >
                              {COPY.recordsList.edit}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </th>
                {columns.map((column, index) => {
                  const value = row.cells[column.key];
                  const isEmpty = value === COPY.recordsList.emptyCell;
                  const isMemo = column.key === "memo";

                  return (
                    <td
                      key={column.key}
                      className={cn(
                        "border-b border-border px-3 py-2.5 align-top",
                        index < columns.length - 1 && "border-r",
                        rowBg,
                        isEmpty && "text-muted-foreground"
                      )}
                    >
                      {isMemo && !isEmpty ? (
                        <p className="whitespace-pre-wrap break-words">
                          {value}
                        </p>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
