// Whether an attachment reference actually points to a downloadable file.
//
// The project "files" map stores an entry per document slot; an empty slot is
// persisted as `{}` (not null), so a truthiness check (`!!fileObj`) wrongly
// treats an empty slot as "has a file" and renders a dead download button that
// always fails. A real reference must carry at least one of: a stored fileId
// (IndexedDB / Drive), inline base64 `data`, or a `fileUrl`. A bare filename
// string also counts.
export function fileObjectHasContent(fileObj) {
  if (!fileObj) return false;
  if (typeof fileObj === 'string') return fileObj.trim().length > 0;
  if (typeof fileObj !== 'object') return false;
  return Boolean(fileObj.fileId || fileObj.data || fileObj.fileUrl);
}
