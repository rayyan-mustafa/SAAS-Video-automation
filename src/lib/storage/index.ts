import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface StorageProvider {
  name: 'r2' | 'local';
  putObject(key: string, data: Buffer | string, contentType?: string): Promise<{ key: string; url: string; filePath?: string }>;
  getObject(key: string): Promise<Buffer | null>;
  getUrl(key: string): string;
  getFilePath(key: string): string;
  deleteObject(key: string): Promise<boolean>;
  checkHealth(): Promise<{ status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'FAILED'; details?: string }>;
}

class R2StorageProvider implements StorageProvider {
  name = 'r2' as const;
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;
  private localCacheDir: string;

  constructor(accountId: string, accessKeyId: string, secretAccessKey: string, bucketName: string, publicUrl?: string) {
    this.bucketName = bucketName;
    this.publicUrl = publicUrl ? publicUrl.replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    this.localCacheDir = isServerless ? path.join('/tmp', 'storage') : path.join(process.cwd(), 'storage');
    if (!fs.existsSync(this.localCacheDir)) {
      fs.mkdirSync(this.localCacheDir, { recursive: true });
    }
  }

  getFilePath(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.localCacheDir, sanitized);
  }

  getUrl(key: string): string {
    const sanitized = key.replace(/^\/+/, '');
    if (this.publicUrl.startsWith('http')) {
      return `${this.publicUrl}/${sanitized}`;
    }
    return `/api/assets/${sanitized}`;
  }

  async putObject(key: string, data: Buffer | string, contentType?: string): Promise<{ key: string; url: string; filePath: string }> {
    const sanitized = key.replace(/^\/+/, '');
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

    // Cache locally as well
    const localPath = this.getFilePath(sanitized);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(localPath, buffer);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: sanitized,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      })
    );

    return {
      key: sanitized,
      url: this.getUrl(sanitized),
      filePath: localPath,
    };
  }

  async getObject(key: string): Promise<Buffer | null> {
    const sanitized = key.replace(/^\/+/, '');
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: sanitized,
        })
      );
      if (response.Body) {
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        return Buffer.concat(chunks);
      }
    } catch (err) {
      // Check local cache fallback
      const localPath = this.getFilePath(sanitized);
      if (fs.existsSync(localPath)) {
        return await fs.promises.readFile(localPath);
      }
    }
    return null;
  }

  async deleteObject(key: string): Promise<boolean> {
    const sanitized = key.replace(/^\/+/, '');
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: sanitized,
        })
      );
      const localPath = this.getFilePath(sanitized);
      if (fs.existsSync(localPath)) {
        await fs.promises.unlink(localPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async checkHealth(): Promise<{ status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'FAILED'; details?: string }> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return { status: 'CONFIGURED', details: `Connected to Cloudflare R2 bucket: ${this.bucketName}` };
    } catch (err: any) {
      return { status: 'FAILED', details: `R2 check error: ${err.message}` };
    }
  }
}

class LocalStorageProvider implements StorageProvider {
  name = 'local' as const;
  private baseDir: string;

  constructor() {
    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    this.baseDir = isServerless ? path.join('/tmp', 'storage') : path.join(process.cwd(), 'storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getFilePath(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, sanitized);
  }

  getUrl(key: string): string {
    const sanitized = key.replace(/^\/+/, '');
    return `/api/assets/${sanitized}`;
  }

  async putObject(key: string, data: Buffer | string, contentType?: string): Promise<{ key: string; url: string; filePath: string }> {
    const sanitized = key.replace(/^\/+/, '');
    const fullPath = this.getFilePath(sanitized);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (typeof data === 'string') {
      await fs.promises.writeFile(fullPath, data, 'utf8');
    } else {
      await fs.promises.writeFile(fullPath, data);
    }

    return {
      key: sanitized,
      url: this.getUrl(sanitized),
      filePath: fullPath,
    };
  }

  async getObject(key: string): Promise<Buffer | null> {
    const fullPath = this.getFilePath(key);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return await fs.promises.readFile(fullPath);
  }

  async deleteObject(key: string): Promise<boolean> {
    const fullPath = this.getFilePath(key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  async checkHealth(): Promise<{ status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'FAILED'; details?: string }> {
    try {
      const testFile = path.join(this.baseDir, '.healthcheck');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return { status: 'CONFIGURED', details: `Local storage operational at ${this.baseDir}` };
    } catch (err: any) {
      return { status: 'FAILED', details: `Local storage error: ${err.message}` };
    }
  }
}

// Factory to initialize active storage provider based on environment variables
function createStorageProvider(): StorageProvider {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (accountId && accessKeyId && secretAccessKey && bucketName) {
    return new R2StorageProvider(accountId, accessKeyId, secretAccessKey, bucketName, publicUrl);
  }

  return new LocalStorageProvider();
}

export const storage: StorageProvider = createStorageProvider();

export function getTempDir(sub?: string): string {
  const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const base = isServerless ? path.join('/tmp', 'temp') : path.join(process.cwd(), 'temp');
  const target = sub ? path.join(base, sub) : base;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}
