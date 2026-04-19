import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

const CreateReportSchema = z.object({
  title: z.string().min(1).max(200),
  project_id: z.string().optional(),
  author: z.string().optional(),
});

const UpdateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  project_id: z.string().optional(),
  author: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { data, error } = await supabase
      .from('reports')
      .select('id, title, project_id, author, share_token, created_at, updated_at, report_steps(count)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const reports = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      step_count: (r.report_steps as Array<{ count: number }>)?.[0]?.count ?? 0,
      report_steps: undefined,
    }));
    res.json({ reports });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { data: report, error } = await supabase
      .from('reports').select('*')
      .eq('id', req.params.id).eq('user_id', uid).single();

    if (error || !report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const { data: steps, error: stepsError } = await supabase
      .from('report_steps').select('*')
      .eq('report_id', req.params.id).order('step_index', { ascending: true });

    if (stepsError) throw stepsError;
    res.json({ report, steps: steps ?? [] });
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const parsed = CreateReportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { data, error } = await supabase
      .from('reports').insert({ ...parsed.data, user_id: uid }).select().single();

    if (error) throw error;
    res.status(201).json({ report: data });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const parsed = UpdateReportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { data, error } = await supabase
      .from('reports').update(parsed.data)
      .eq('id', req.params.id).eq('user_id', uid).select().single();

    if (error || !data) { res.status(404).json({ error: 'Report not found.' }); return; }
    res.json({ report: data });
  } catch (err) { next(err); }
});

router.get('/:id/step-images', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { data: report } = await supabase
      .from('reports').select('id').eq('id', req.params.id).eq('user_id', uid).single();
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const { data: images, error } = await supabase
      .from('step_images').select('*').eq('report_id', req.params.id).order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ images: images ?? [] });
  } catch (err) { next(err); }
});

router.delete('/:id/share-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { error } = await supabase
      .from('reports').update({ share_token: null })
      .eq('id', req.params.id).eq('user_id', uid);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { error } = await supabase
      .from('reports').delete()
      .eq('id', req.params.id).eq('user_id', uid);

    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
