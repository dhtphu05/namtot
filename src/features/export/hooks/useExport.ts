import { useCallback, useState } from "react";
import { exportApi, type ExportApplicationsParams, type ExportDataset, type ExportFormat } from "../api/export";

function getFilename(dataset: ExportDataset, format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  return `sv5t-${dataset}-${date}.${format}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useExportApplications() {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportingDataset, setExportingDataset] = useState<ExportDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getExportUrl = useCallback((format: ExportFormat, params?: ExportApplicationsParams) => {
    return exportApi.getApplicationsExportUrl(format, params);
  }, []);

  const downloadDataset = useCallback(async (
    dataset: ExportDataset,
    format: ExportFormat,
    params?: ExportApplicationsParams,
  ) => {
    setExportingFormat(format);
    setExportingDataset(dataset);
    setError(null);

    try {
      const blob =
        dataset === "applications"
          ? await exportApi.downloadApplicationsExport(format, params)
          : dataset === "reviewTasks"
            ? await exportApi.downloadReviewTasksExport(params)
            : await exportApi.downloadReviewResultsExport(format, params);
      triggerBlobDownload(blob, getFilename(dataset, format));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Không thể xuất dữ liệu hồ sơ.";
      setError(message);
      throw caughtError;
    } finally {
      setExportingFormat(null);
      setExportingDataset(null);
    }
  }, []);

  const download = useCallback(async (format: ExportFormat, params?: ExportApplicationsParams) => {
    await downloadDataset("applications", format, params);
  }, [downloadDataset]);

  const downloadCsv = useCallback(
    async (params?: ExportApplicationsParams) => {
      await download("csv", params);
    },
    [download],
  );

  const downloadJson = useCallback(
    async (params?: ExportApplicationsParams) => {
      await download("json", params);
    },
    [download],
  );

  return {
    error,
    exportingDataset,
    exportingFormat,
    getExportUrl,
    isExporting: Boolean(exportingDataset),
    download,
    downloadDataset,
    downloadCsv,
    downloadJson,
  };
}
