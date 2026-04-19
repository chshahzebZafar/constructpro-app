import { Router, Request, Response, NextFunction } from 'express';
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

    const html = buildReportHtml(report, stepsWithFreshUrls);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildReportHtml(report: Record<string, unknown>, steps: Array<Record<string, unknown>>): string {
  const date = new Date(report.created_at as string).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const stepsHtml = steps.map((step, i) => {
    const lat = step.location_lat != null ? Number(step.location_lat) : null;
    const lng = step.location_lng != null ? Number(step.location_lng) : null;
    const hasCoords = lat !== null && lng !== null;
    const locLabel = [step.location_name, hasCoords ? `${lat!.toFixed(6)}, ${lng!.toFixed(6)}` : null].filter(Boolean).join(' · ');
    const mapUrl = hasCoords ? satelliteMapUrl(lat!, lng!) : null;
    const mapsLink = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    return `
      <div class="step">
        <div class="step-header">Step ${i + 1}</div>
        ${step.image_url ? `<img src="${esc(step.image_url as string)}" class="step-img"/>` : ''}
        <div class="step-body">
          ${locLabel ? `<p class="loc">📍 ${esc(locLabel)}</p>` : ''}
          ${mapUrl
            ? `<div class="map-wrap"><a href="${mapsLink}" target="_blank"><img src="${mapUrl}" class="map-img" alt="Satellite map"/></a><div class="map-badge">🛰 Satellite · Click to open</div></div>`
            : mapsLink
            ? `<p class="map-link"><a href="${mapsLink}" target="_blank">🗺️ View on Google Maps</a></p>`
            : ''
          }
          ${step.description ? `<p class="desc">${esc(step.description as string)}</p>` : ''}
          ${step.optional_field ? `<p class="notes"><strong>Notes:</strong> ${esc(step.optional_field as string)}</p>` : ''}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${esc(report.title as string)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;padding:24px}
.cover{border-bottom:3px solid #1B3A5C;padding-bottom:20px;margin-bottom:28px}
.cover h1{font-size:26px;color:#1B3A5C}
.cover .meta{font-size:13px;color:#555;margin-top:8px}
.step{margin-bottom:32px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;page-break-inside:avoid}
.step-header{background:#1B3A5C;color:#fff;padding:8px 16px;font-weight:700;font-size:14px}
.step-img{width:100%;max-height:320px;object-fit:cover;display:block}
.step-body{padding:14px 16px}
.loc{font-size:12px;color:#6b7280;margin-bottom:8px}
.map-wrap{position:relative;margin-bottom:10px;border-radius:8px;overflow:hidden;border:1px solid #d1d5db}
.map-img{width:100%;height:220px;object-fit:cover;display:block}
.map-badge{position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:3px 8px;border-radius:12px}
.map-link{margin-bottom:10px;font-size:13px}
.desc{font-size:14px;line-height:1.6;color:#374151;margin-bottom:8px}
.notes{font-size:13px;color:#6b7280}
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

export default router;
