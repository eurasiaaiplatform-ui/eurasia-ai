const express = require('express');
const app = express();
const http = require('http');
const path = require('path');

app.use(express.json());

// Express middleware for CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  next();
});

// Serve frontend web page
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle incoming file upload stream and trade logic
app.post('/', (req, res) => {
  let body = [];

  // Read incoming file upload stream
  req.on('data', (chunk) => {
    body.push(chunk);
  });

  req.on('end', () => {
    const rawContent = Buffer.concat(body).toString('utf8');

    try {
      // Process incoming payload
      const data = JSON.parse(rawContent);
      
      // Send successful response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'success', 
        message: 'Data processed successfully',
        data: data 
      }));
    } catch (err) {
      // Handle parsing error
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'error', 
        message: 'Invalid JSON payload' 
      }));
    }
  });
});

// Start server
const PORT = process.env.PORT || 5678;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
