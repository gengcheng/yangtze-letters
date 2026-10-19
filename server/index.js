import express from 'express';
import { fileURLToPath } from 'node:url';
import { validate, search } from './travel.js';
import { LearningAiError, learningKinds, validateLearningInput, modelConfig, generateLearning, createLearningLimit } from './learning-ai.js';
const app = express();
// Runtime credentials and optional upstream URLs are configured through environment variables.
app.use(express.json({limit:'20kb'}));
app.post(['/travel-api/search', '/api/travel/search'], async (req,res) => {
  try { validate(req.body); } catch (e) { return res.status(400).json({error:e.message}); }
  res.json(await search(req.body));
});
const acquireLearningCall = createLearningLimit();
for (const kind of learningKinds) {
  app.post(`/learning-ai/${kind}`, async (req, res) => {
    let release;
    try {
      const input = validateLearningInput(kind, req.body);
      const config = modelConfig();
      release = acquireLearningCall();
      res.set('Cache-Control', 'no-store');
      res.json(await generateLearning(kind, input, { config }));
    } catch (error) {
      const status = error instanceof LearningAiError ? error.status : 502;
      if (status === 429) res.set('Retry-After', '60');
      res.status(status).json({ error: error instanceof LearningAiError ? error.message : 'AI服务暂时不可用，请稍后重试' });
    } finally { release?.(); }
  });
}
app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));
app.get('/{*path}', (req,res) => res.sendFile(fileURLToPath(new URL('../dist/index.html',import.meta.url))));
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
app.listen(port,host,()=>console.log(`长江来信 API / 生产应用：http://${host}:${port}`));
