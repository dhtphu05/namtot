type ExtractedField = {
  key: string;
  label: string;
  value: string;
};

type ExtractedFieldsTableProps = {
  fields: ExtractedField[];
};

export function ExtractedFieldsTable({ fields }: ExtractedFieldsTableProps) {
  if (!fields.length) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Chưa có trường thông tin rõ ràng từ thẻ minh chứng.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="divide-y">
        {fields.map((field) => (
          <div
            key={field.key}
            className="grid gap-1 p-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]"
          >
            <div className="font-medium text-muted-foreground">{field.label}</div>
            <div className="min-w-0 break-words text-foreground">{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
