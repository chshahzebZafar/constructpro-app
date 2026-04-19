import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  // CAD
  'application/acad',
  'application/x-acad',
  'application/autocad_dwg',
  'image/vnd.dwg',
  'image/x-dwg',
  'application/dwg',
  'application/x-dwg',
  'application/dxf',
  'application/x-dxf',
  'image/vnd.dxf',
  'application/octet-stream', // fallback for DWG/DXF which vary by OS
]);

const FILE_BUCKET = 'project-files';

function detectFileType(name: string, mime: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'dwg') return 'dwg';
  if (ext === 'dxf') return 'dxf';
  if (['jpg', 'jpeg'].includes(ext) || mime === 'image/jpeg') return 'jpg';
  if (ext === 'png' || mime === 'image/png') return 'png';
  if (ext === 'tiff' || ext === 'tif') return 'tiff';
  return ext || 'unknown';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const allowedExts = ['pdf','docx','doc','xlsx','xls','pptx','ppt','dwg','dxf','jpg','jpeg','png','tiff','tif'];
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: .${ext}`));
    }
  },
});

// GET /api/v1/files — list user's files
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const projectId = req.query.project_id as string | undefined;

    let query = supabase
      .from('project_files')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ files: data ?? [] });
  } catch (err) { next(err); }
});

// POST /api/v1/files — upload a file
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    if (!req.file) { res.status(400).json({ error: 'A file is required.' }); return; }

    const projectId = req.body.project_id ?? null;
    const originalName = req.file.originalname;
    const fileType = detectFileType(originalName, req.file.mimetype);
    const ext = originalName.split('.').pop()?.toLowerCase() ?? fileType;
    const storagePath = `${uid}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(FILE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days
    if (signedError) throw signedError;

    const { data: record, error: insertError } = await supabase
      .from('project_files')
      .insert({
        user_id: uid,
        project_id: projectId,
        name: originalName,
        file_type: fileType,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_path: storagePath,
        file_url: signedData.signedUrl,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    res.status(201).json({ file: record });
  } catch (err) { next(err); }
});

// GET /api/v1/files/:id/url — get fresh signed URL (signed URLs expire after 7 days)
router.get('/:id/url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { data: record } = await supabase
      .from('project_files')
      .select('storage_path')
      .eq('id', req.params.id)
      .eq('user_id', uid)
      .single();

    if (!record) { res.status(404).json({ error: 'File not found.' }); return; }

    const { data, error } = await supabase.storage
      .from(FILE_BUCKET)
      .createSignedUrl(record.storage_path as string, 60 * 60 * 24 * 7);
    if (error) throw error;

    res.json({ url: data.signedUrl });
  } catch (err) { next(err); }
});

// DELETE /api/v1/files/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { data: record } = await supabase
      .from('project_files')
      .select('storage_path')
      .eq('id', req.params.id)
      .eq('user_id', uid)
      .single();

    if (!record) { res.status(404).json({ error: 'File not found.' }); return; }

    await supabase.from('project_files').delete().eq('id', req.params.id).eq('user_id', uid);
    await supabase.storage.from(FILE_BUCKET).remove([record.storage_path as string]).catch(console.warn);

    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
