import express from 'express';
import { startAgent } from './src/alkosto-graduated-search-agent';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  try {
    const result = await startAgent("Hola"); // später anpassen für echten Chat
    res.send(result);
  } catch (err) {
    console.error('Error in / route:', err);
    res.status(500).send('Agent error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

