"use client";

import { useDriveData } from "@/hooks/useDriveData";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  FileText,
  Table2,
  Presentation,
  FileImage,
  Folder,
  File,
  FileType,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  doc: FileText,
  sheet: Table2,
  slide: Presentation,
  pdf: FileType,
  folder: Folder,
  image: FileImage,
  other: File,
};

const colorMap: Record<string, string> = {
  doc: "text-blue-400",
  sheet: "text-green-400",
  slide: "text-yellow-400",
  pdf: "text-red-400",
  folder: "text-[#8B8FA3]",
  image: "text-purple-400",
  other: "text-[#8B8FA3]",
};

export default function DriveWidget() {
  const { files } = useDriveData();

  return (
    <div className="space-y-0.5">
      {files.map((file) => {
        const Icon = iconMap[file.iconType] || File;
        const color = colorMap[file.iconType] || "text-[#8B8FA3]";
        return (
          <div
            key={file.id}
            className="flex items-center gap-2.5 p-2 rounded hover:bg-[#252833]/50 transition-colors"
          >
            <Icon className={`w-4 h-4 shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#F1F3F5] truncate">
                {file.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {file.sharedBy && (
                  <span className="text-[10px] text-[#8B8FA3]">
                    {file.sharedBy}
                  </span>
                )}
                <span className="text-[10px] font-mono tabular-nums text-[#4A4E5F]">
                  {formatDistanceToNow(parseISO(file.modifiedTime), {
                    addSuffix: true,
                  })}
                </span>
                {file.size && (
                  <span className="text-[10px] text-[#4A4E5F]">
                    {file.size}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
