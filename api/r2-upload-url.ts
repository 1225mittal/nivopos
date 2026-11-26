/**
 * Nivo POS - Cloudflare R2 Presigned Upload URL Generator
 * File: api/r2-upload-url.ts
 *
 * Generates a presigned PUT URL and object key for direct, secure uploads
 * to Cloudflare R2 object storage using @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST or GET.',
    });
  }

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
  ).replace(/\/$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return res.status(500).json({
      success: false,
      error:
        'Server R2 configuration missing. Ensure CLOUDFLARE_R2_ACCOUNT_ID (or R2_ACCOUNT_ID), CLOUDFLARE_R2_ACCESS_KEY_ID (or R2_ACCESS_KEY_ID), CLOUDFLARE_R2_SECRET_ACCESS_KEY (or R2_SECRET_ACCESS_KEY), and CLOUDFLARE_R2_BUCKET_NAME (or R2_BUCKET_NAME) are configured in environment variables.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const query = req.query || {};

    const action = body.action || query.action || 'upload';
    const rawFileName =
      body.fileName || body.filename || query.fileName || query.filename || 'file';
    const contentType =
      body.contentType ||
      body.fileType ||
      query.contentType ||
      query.fileType ||
      'application/octet-stream';
    const storeId = body.storeId || body.store_id || query.storeId || query.store_id || '';
    const folder = body.folder || query.folder || 'uploads';
    const customKey = body.key || query.key;
    const expiresIn = Number(body.expiresIn || query.expiresIn) || 3600;

    // Sanitize file name: remove non-alphanumeric characters (except dots, underscores, dashes)
    const sanitizedFileName = String(rawFileName)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    // Generate object key: ${storeId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sanitizedFileName}
    const cleanStoreId = String(storeId).trim().replace(/^\/+|\/+$/g, '');
    const cleanFolder = String(folder).trim().replace(/^\/+|\/+$/g, '');
    const randomSuffix = Math.random().toString(36).slice(2, 7);

    const objectKey = customKey
      ? String(customKey).replace(/^\/+/, '')
      : cleanStoreId
      ? `${cleanStoreId}/${cleanFolder}/${Date.now()}-${randomSuffix}-${sanitizedFileName}`
      : `${cleanFolder}/${Date.now()}-${randomSuffix}-${sanitizedFileName}`;

    const s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl}/${objectKey}`
      : `https://${bucketName}.r2.cloudflarestorage.com/${objectKey}`;

    // 1. Action: View / Download presigned GET URL
    if (action === 'view' || action === 'download' || action === 'get') {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const downloadUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: Math.min(Math.max(60, expiresIn), 86400),
      });

      return res.status(200).json({
        success: true,
        downloadUrl,
        url: downloadUrl,
        key: objectKey,
        fileKey: objectKey,
        publicUrl,
        bucket: bucketName,
        expiresIn,
      });
    }

    // 2. Action: Upload presigned PUT URL (Default)
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: Math.min(Math.max(60, expiresIn), 86400),
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
      url: uploadUrl,
      key: objectKey,
      fileKey: objectKey,
      publicUrl,
      bucket: bucketName,
      contentType,
      expiresIn,
    });
  } catch (err: any) {
    console.error('[R2 Presign Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate R2 presigned URL.',
    });
  }
}
