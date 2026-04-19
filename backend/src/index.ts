import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import reportsRouter from './routes/reports';
import stepsRouter from './routes/steps';
import exportRouter from './routes/export';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.allowedOrigin }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/api/v1/reports', requireAuth, reportsRouter);
app.use('/api/v1/reports/:reportId/steps', requireAuth, stepsRouter);
app.use('/api/v1/reports/:reportId/export', requireAuth, exportRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`✅  ConstructPro backend running on port ${env.port}`);
});

export default app;
