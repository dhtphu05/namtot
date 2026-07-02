import { useCallback, useState } from "react";
import { exportApi, type ExportApplicationsParams, type ExportFormat } from "../api/export";

function getFilename(format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  return `sv5t-applications-${date}.${format}`;
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
  const [error, setError] = useState<string | null>(null);

  const getExportUrl = useCallback((format: ExportFormat, params?: ExportApplicationsParams) => {
    return exportApi.getApplicationsExportUrl(format, params);
  }, []);

  const download = useCallback(async (format: ExportFormat, params?: ExportApplicationsParams) => {
    setExportingFormat(format);
    setError(null);

    try {
      const blob = await exportApi.downloadApplicationsExport(format, params);
      triggerBlobDownload(blob, getFilename(format));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Không thể xuất dữ liệu hồ sơ.";
      setError(message);
      throw caughtError;
    } finally {
      setExportingFormat(null);
    }
  }, []);

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
    exportingFormat,
    getExportUrl,
    isExporting: Boolean(exportingFormat),
    download,
    downloadCsv,
    downloadJson,
  };
}
