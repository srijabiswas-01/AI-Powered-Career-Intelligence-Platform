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
