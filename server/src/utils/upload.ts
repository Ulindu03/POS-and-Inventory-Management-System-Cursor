import path from 'path';
import fs from 'fs';

let multer: any | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const multerLib = require('multer');
  multer = multerLib.default ?? multerLib;
} catch {
  // keep undefined; we'll export a dummy middleware below
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let upload: any;
if (multer) {
  const storage: any = multer.diskStorage({
    destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req: any, file: { originalname: string }, cb: (error: Error | null, filename: string) => void) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${name}-${unique}${ext}`);
    }
  });

  upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  });
} else {
  // Fallback middleware to keep server running if multer isn't installed
  const disabledMsg = 'File upload is disabled: multer is not installed. Run `npm i multer` in server folder.';
  upload = {
    single: (_field: string) => (_req: any, res: any, _next: any) => {
      res.status(500).json({ success: false, message: disabledMsg });
    }
  } as const;
}

export { upload };
export const getPublicUrl = (filename: string) => `/uploads/${filename}`;
