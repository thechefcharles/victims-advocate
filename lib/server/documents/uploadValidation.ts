/**
 * Phase 6: Centralized upload validation – allowed types, size limit, plain-language errors.
 */

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "heic",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "vbs", "js", "jar", "wsf",
  "sh", "bash", "ps1", "dll", "so", "dylib",
  "zip", "rar", "7z", "tar", "gz", "doc", "docx", "xls", "xlsx",
]);

export type UploadValidation = {
  valid: boolean;
  errors: string[];
};

function extFromName(name: string): string {
  const i = name.lastIndexOf(".");
  if (i === -1) return "";
  return name.slice(i + 1).toLowerCase().trim();
}

export function validateUpload(file: File): UploadValidation {
  const errors: string[] = [];

  const ext = extFromName(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    errors.push("This file type is not allowed for security reasons.");
  }
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    errors.push(
      `Allowed types: PDF, JPG, PNG${ALLOWED_EXTENSIONS.has("heic") ? ", HEIC" : ""}. Your file has extension "${ext}".`
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (mime && !ALLOWED_MIME.has(mime)) {
    errors.push(
      `Allowed file types: PDF, JPG, PNG. Your file type (${file.type || "unknown"}) is not allowed.`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    errors.push(`File is too large. Maximum size is ${maxMb} MB.`);
  }
  if (file.size <= 0) {
    errors.push("File is empty.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
