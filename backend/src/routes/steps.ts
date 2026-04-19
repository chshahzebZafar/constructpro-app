import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { describeConstructionImage } from '../lib/openai';
import { env } from '../config/env';
import type { AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) { cb(new Error('Only image files are allowed.')); return; }
    cb(null, true);
  },
});

const UpdateStepSchema = z.object({
  description: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  location_name: z.string().optional(),
  optional_field: z.string().optional(),
  step_index: z.number().int().optional(),
});

async function verifyReport(reportId: string, uid: string, res: Response): Promise<boolean> {
  const { data, error } = await supabase
    .from('reports').select('id').eq('id', reportId).eq('user_id', uid).single();
  if (error || !data) { res.status(404).json({ error: 'Report not found.' }); return false; }
  return true;
}

// POST /reports/:reportId/steps — upload image + AI describe + save
router.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { reportId } = req.params as { reportId: string };

    if (!(await verifyReport(reportId, uid, res))) return;
    if (!req.file) { res.status(400).json({ error: 'An image file is required.' }); return; }

    const { count } = await supabase
      .from('report_steps').select('id', { count: 'exact', head: true }).eq('report_id', reportId);

    const stepIndex = typeof count === 'number' ? count : 0;
    const ext = req.file.mimetype.split('/')[1] ?? 'jpg';
    const storagePath = `${uid}/${reportId}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(env.supabase.bucket)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(env.supabase.bucket).createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (signedError) throw signedError;

    const imageUrl = signedData.signedUrl;

    let description = '';
    try { description = await describeConstructionImage(imageUrl); }
    catch (aiErr) { console.warn('[AI] Description failed:', aiErr); }

    const { data: step, error: insertError } = await supabase
      .from('report_steps').insert({
        report_id: reportId,
        step_index: stepIndex,
        image_url: imageUrl,
        image_path: storagePath,
        description,
        location_lat: req.body.location_lat ? Number(req.body.location_lat) : null,
        location_lng: req.body.location_lng ? Number(req.body.location_lng) : null,
        location_name: req.body.location_name ?? null,
        optional_field: req.body.optional_field ?? null,
      }).select().single();

    if (insertError) throw insertError;
    res.status(201).json({ step });
  } catch (err) { next(err); }
});

// PATCH /reports/:reportId/steps/:stepId
router.patch('/:stepId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { reportId, stepId } = req.params as { reportId: string; stepId: string };

    if (!(await verifyReport(reportId, uid, res))) return;

    const parsed = UpdateStepSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { data, error } = await supabase
      .from('report_steps').update(parsed.data)
      .eq('id', stepId).eq('report_id', reportId).select().single();

    if (error || !data) { res.status(404).json({ error: 'Step not found.' }); return; }
    res.json({ step: data });
  } catch (err) { next(err); }
});

// DELETE /reports/:reportId/steps/:stepId
router.delete('/:stepId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { reportId, stepId } = req.params as { reportId: string; stepId: string };

    if (!(await verifyReport(reportId, uid, res))) return;

    const { data: step } = await supabase
      .from('report_steps').select('image_path')
      .eq('id', stepId).eq('report_id', reportId).single();

    const { error } = await supabase
      .from('report_steps').delete().eq('id', stepId).eq('report_id', reportId);
    if (error) throw error;

    if (step?.image_path) {
      await supabase.storage.from(env.supabase.bucket).remove([step.image_path]).catch(console.warn);
    }

    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
