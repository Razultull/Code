"use client";

import { useState, useEffect, useCallback } from "react";
import type { DriveFile } from "@/types/drive";
import { mockDriveFiles } from "@/data/mock-data";

export function useDriveData() {
  const [files, setFiles] = useState<DriveFile[]>(mockDriveFiles);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data?file=drive-files", {
        cache: "no-store",
      });
      if (res.ok) {
        const data: DriveFile[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFiles(data);
        } else {
          setFiles(mockDriveFiles);
        }
      }
    } catch {
      setFiles(mockDriveFiles);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { files, loading };
}
