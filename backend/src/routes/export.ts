import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import type { AuthRequest } from '../middleware/auth';

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

function satelliteMapUrl(lat: number, lng: number, zoom = 16): string | null {
  if (MAPBOX_TOKEN) {
    return (
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static` +
      `/pin-s+ff0000(${lng},${lat})/${lng},${lat},${zoom},0/600x260` +
      `?access_token=${MAPBOX_TOKEN}`
    );
  }
  if (GMAPS_KEY) {
    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${lat},${lng}&zoom=${zoom}&size=600x260` +
      `&maptype=satellite` +
      `&markers=color:red%7C${lat},${lng}` +
      `&key=${GMAPS_KEY}`
    );
  }
  return null;
}

const router = Router({ mergeParams: true });
export const shareRouter = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { reportId } = req.params as { reportId: string };

    const { data: report, error } = await supabase
      .from('reports').select('*').eq('id', reportId).eq('user_id', uid).single();

    if (error || !report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const { data: steps, error: stepsError } = await supabase
      .from('report_steps').select('*').eq('report_id', reportId).order('step_index', { ascending: true });

    if (stepsError) throw stepsError;

    const stepsWithFreshUrls = await Promise.all(
      (steps ?? []).map(async (step: Record<string, unknown>) => {
        if (!step.image_path) return step;
        const { data } = await supabase.storage
          .from(env.supabase.bucket).createSignedUrl(step.image_path as string, 3600);
        return { ...step, image_url: data?.signedUrl ?? step.image_url };
      })
    );

    // Fetch extra images for each step
    const { data: allExtraImages } = await supabase
      .from('step_images').select('*').eq('report_id', reportId).order('sort_order', { ascending: true });

    const extraByStep: Record<string, string[]> = {};
    for (const img of allExtraImages ?? []) {
      const sid = img.step_id as string;
      if (!extraByStep[sid]) extraByStep[sid] = [];
      extraByStep[sid].push(img.image_url as string);
    }

    const html = await buildReportHtml(report, stepsWithFreshUrls, extraByStep);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/png';
    const buffer = await res.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

async function buildReportHtml(report: Record<string, unknown>, steps: Array<Record<string, unknown>>, extraByStep: Record<string, string[]> = {}): Promise<string> {
  const date = new Date(report.created_at as string).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const stepsHtml = (await Promise.all(steps.map(async (step, i) => {
    const lat = step.location_lat != null ? Number(step.location_lat) : null;
    const lng = step.location_lng != null ? Number(step.location_lng) : null;
    const hasCoords = lat !== null && lng !== null;
    const locLabel = [step.location_name, hasCoords ? `${lat!.toFixed(6)}, ${lng!.toFixed(6)}` : null].filter(Boolean).join(' · ');
    const mapUrl = hasCoords ? satelliteMapUrl(lat!, lng!) : null;
    const mapsLink = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    const mapDataUri = mapUrl ? await fetchAsBase64(mapUrl) : null;
    const status = (step.status as string) || 'pending';
    const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
      pass:      { label: '✅ Pass',            color: '#16a34a', bg: '#dcfce7' },
      fail:      { label: '❌ Fail',            color: '#dc2626', bg: '#fee2e2' },
      attention: { label: '⚠️ Needs Attention', color: '#d97706', bg: '#fef3c7' },
      pending:   { label: '⏳ Pending',         color: '#6b7280', bg: '#f3f4f6' },
    };
    const sc = statusCfg[status] ?? statusCfg['pending'];
    const isLast = i === steps.length - 1;
    return `
      <div class="step" style="${isLast ? '' : 'page-break-after:always;'}">
        <div class="step-header">Step ${i + 1} <span class="status-badge" style="background:${sc.bg};color:${sc.color}">${sc.label}</span></div>
        ${step.image_url ? `<img src="${esc(step.image_url as string)}" class="step-img"/>` : ''}
        <div class="step-body">
          ${locLabel ? `<p class="loc">📍 ${esc(locLabel)}</p>` : ''}
          ${mapDataUri
            ? `<div class="map-wrap"><img src="${mapDataUri}" class="map-img" alt="Satellite map"/><div class="map-badge">🛰 Satellite</div></div>`
            : mapsLink
            ? `<p class="map-link"><a href="${mapsLink}" target="_blank">🗺️ View on Google Maps: ${lat?.toFixed(5)}, ${lng?.toFixed(5)}</a></p>`
            : ''
          }
          ${(() => {
            const extras = extraByStep[step.id as string] ?? [];
            if (!extras.length) return '';
            return `<div class="img-grid">${extras.map(url => `<img src="${url}" class="grid-img"/>`).join('')}</div>`;
          })()}
          ${step.description ? `<p class="desc">${esc(step.description as string)}</p>` : ''}
          ${step.optional_field ? `<p class="notes"><strong>Notes:</strong> ${esc(step.optional_field as string)}</p>` : ''}
          ${(() => {
            const items = Array.isArray(step.checklist) ? step.checklist as Array<{label: string; checked: boolean}> : [];
            if (!items.length) return '';
            const done = items.filter(i => i.checked).length;
            return `<div class="checklist">
              <p class="checklist-title">Checklist (${done}/${items.length} done)</p>
              ${items.map(i => `<div class="cl-item"><span class="cl-box">${i.checked ? '✅' : '☐'}</span><span class="${i.checked ? 'cl-done' : ''}">${esc(i.label)}</span></div>`).join('')}
            </div>`;
          })()}
        </div>
      </div>`;
  }))).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${esc(report.title as string)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;padding:24px}
.cover{border-bottom:3px solid #1B3A5C;padding-bottom:20px;margin-bottom:28px}
.cover h1{font-size:26px;color:#1B3A5C}
.cover .meta{font-size:13px;color:#555;margin-top:8px}
.step{margin-bottom:32px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;page-break-inside:avoid}
.step-header{background:#1B3A5C;color:#fff;padding:8px 16px;font-weight:700;font-size:14px;display:flex;align-items:center;gap:10px}
.status-badge{font-size:11px;padding:2px 10px;border-radius:12px;font-weight:600}
.step-img{width:100%;max-height:320px;object-fit:cover;display:block}
.step-body{padding:14px 16px}
.loc{font-size:12px;color:#6b7280;margin-bottom:8px}
.map-wrap{position:relative;margin-bottom:10px;border-radius:8px;overflow:hidden;border:1px solid #d1d5db}
.map-img{width:100%;height:220px;object-fit:cover;display:block}
.map-badge{position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:3px 8px;border-radius:12px}
.map-link{margin-bottom:10px;font-size:13px}
.img-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:10px}
.grid-img{width:100%;height:140px;object-fit:cover;border-radius:6px;display:block}
.checklist{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#f9fafb}
.checklist-title{font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;text-transform:uppercase}
.cl-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;margin-bottom:4px}
.cl-box{font-size:14px;min-width:18px}
.cl-done{text-decoration:line-through;color:#9ca3af}
.desc{font-size:14px;line-height:1.6;color:#374151;margin-bottom:8px}
.notes{font-size:13px;color:#6b7280}
@media print{.step{page-break-after:always}.step:last-child{page-break-after:avoid}}
.footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body>
<div class="cover">
  <h1>${esc(report.title as string)}</h1>
  <p class="meta">${report.author ? `Author: ${esc(report.author as string)} &nbsp;·&nbsp; ` : ''}Date: ${date}${report.project_id ? ` &nbsp;·&nbsp; Project: ${esc(report.project_id as string)}` : ''}</p>
</div>
${stepsHtml}
<div class="footer">Generated by ConstructPro · Site Inspection Report</div>
</body></html>`;
}

// ── Shared helper: build HTML for a report by id ─────────────────────────────

async function buildHtmlForReport(reportId: string): Promise<string | null> {
  const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();
  if (!report) return null;

  const { data: steps } = await supabase
    .from('report_steps').select('*').eq('report_id', reportId).order('step_index', { ascending: true });

  const stepsWithFreshUrls = await Promise.all(
    (steps ?? []).map(async (step: Record<string, unknown>) => {
      if (!step.image_path) return step;
      const { data } = await supabase.storage
        .from(env.supabase.bucket).createSignedUrl(step.image_path as string, 3600);
      return { ...step, image_url: data?.signedUrl ?? step.image_url };
    })
  );

  const { data: allExtraImages } = await supabase
    .from('step_images').select('*').eq('report_id', reportId).order('sort_order', { ascending: true });

  const extraByStep: Record<string, string[]> = {};
  for (const img of allExtraImages ?? []) {
    const sid = img.step_id as string;
    if (!extraByStep[sid]) extraByStep[sid] = [];
    extraByStep[sid].push(img.image_url as string);
  }

  return buildReportHtml(report, stepsWithFreshUrls, extraByStep);
}

// POST /api/v1/reports/:reportId/export/generate-link — create/return share token (requires auth)
router.post('/generate-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = (req as AuthRequest).uid;
    const { reportId } = req.params as { reportId: string };

    const { data: report } = await supabase
      .from('reports').select('id,share_token').eq('id', reportId).eq('user_id', uid).single();
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    let token = report.share_token as string | null;
    if (!token) {
      token = randomBytes(20).toString('hex');
      await supabase.from('reports').update({ share_token: token }).eq('id', reportId);
    }

    res.json({ url: `${env.backendUrl}/share/${token}` });
  } catch (err) { next(err); }
});

// GET /share/:token — public, no auth needed (mounted separately via shareRouter)
shareRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params as { token: string };
    const { data: report } = await supabase
      .from('reports').select('id').eq('share_token', token).single();
    if (!report) { res.status(404).send('<h2>Report not found or link has expired.</h2>'); return; }

    const html = await buildHtmlForReport(report.id as string);
    if (!html) { res.status(404).send('<h2>Report not found.</h2>'); return; }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

export default router;
