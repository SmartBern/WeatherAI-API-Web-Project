import express  from 'express';
import cors     from 'cors';
import fetch    from 'node-fetch';
import path     from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy route
app.get('/api/:endpoint', async (req, res) => {
  const endpoint = req.params.endpoint;
  const queryStr = new URLSearchParams(req.query).toString();
  const apiKey   = req.headers['x-api-key'];

  if (!apiKey) {
    console.error('No API key in request headers');
    return res.status(401).json({ error: 'Missing API key' });
  }

  const targetURL = `https://api.weather-ai.co/v1/${endpoint}?${queryStr}`;
  console.log(`Forwarding to: ${targetURL}`);

  try {
    const apiResponse = await fetch(targetURL, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log(`WeatherAI status: ${apiResponse.status}`);

    const rawText = await apiResponse.text();
    console.log(`Raw response: ${rawText}`);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Non-JSON response:', rawText);
      return res.status(502).json({
        error: 'WeatherAI returned a non-JSON response',
        raw: rawText.slice(0, 300)
      });
    }

    res.status(apiResponse.status).json(data);

  } 
  catch (err) {
    console.error('fetch() error:', err.message);
    res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`WeatherAI proxy running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
