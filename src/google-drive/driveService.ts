/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  description?: string;
}

/**
 * Upload a file/artifact blob to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  dataBlob: Blob,
  description?: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
    description: description || 'Hendy Tools Release Artifact / Backup',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', dataBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result as GoogleDriveFile;
}

/**
 * List files saved in Google Drive accessible by the application
 */
export async function listAppDriveFiles(accessToken: string): Promise<GoogleDriveFile[]> {
  const url =
    'https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink,description)&orderBy=createdTime desc';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API listing failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []) as GoogleDriveFile[];
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation must precede this call)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.text();
    throw new Error(`Xóa tệp Google Drive thất bại (${response.status}): ${err}`);
  }

  return true;
}
