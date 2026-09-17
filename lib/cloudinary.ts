import 'server-only';

import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadResume(file: File, userId: string) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type || 'application/octet-stream'};base64,${bytes.toString('base64')}`;
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'raw',
    folder: `clymbra/resumes/${userId}`,
    public_id: `${randomUUID()}_${safeFilename}`,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteResumeAsset(publicId: string) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return;
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
  if (!['ok', 'not found'].includes(result.result)) throw new Error(`Cloudinary deletion failed: ${result.result}`);
}

export async function fetchResumeAsset(storageUrl: string | null, publicId: string | null, filename: string) {
  if (storageUrl) {
    const response = await fetch(storageUrl, { cache: 'no-store' });
    if (response.ok && response.body) return response;
  }
  if (!publicId) return null;

  // Older Cloudinary raw URLs can be blocked by account delivery settings.
  // The signed download API uses server-side credentials and remains private.
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const idWithoutExtension = extension && publicId.toLowerCase().endsWith(`.${extension}`)
    ? publicId.slice(0, -(extension.length + 1))
    : publicId;
  const signedUrl = cloudinary.utils.private_download_url(idWithoutExtension, extension, {
    resource_type: 'raw',
    type: 'upload',
    attachment: false,
  });
  const response = await fetch(signedUrl, { cache: 'no-store' });
  return response.ok && response.body ? response : null;
}
