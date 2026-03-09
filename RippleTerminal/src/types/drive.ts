export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  sharedBy?: string;
  webViewLink?: string;
  iconType: "doc" | "sheet" | "slide" | "pdf" | "folder" | "image" | "other";
  size?: string;
}
