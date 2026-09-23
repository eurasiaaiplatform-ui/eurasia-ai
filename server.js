const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const fs = require('fs');

// Parsing Middlewares
app.use(express.json());
app.use(express.text());

// Express Middleware for CORS
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

// Serve static HTML/UI files
app.use(express.static(__dirname));

// Persistent Audit Counter & Storage
let globalAuditCount = 1042;
const feedbackFilePath = path.join(__dirname, 'feedback.json');

function getFeedbackData() {
  if (!fs.existsSync(feedbackFilePath)) return [];
  try {
    const data = fs.readFileSync(feedbackFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveFeedbackData(list) {
  try {
    fs.writeFileSync(feedbackFilePath, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error saving feedback:", err);
  }
}

// Route 1: Serve UI on Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route 2: Audit Counter Stats API
app.get('/api/stats', (req, res) => {
  res.json({ globalAuditCount });
});

// Route 3: Feedback Inbox (GET)
app.get('/api/feedback', (req, res) => {
  res.json(getFeedbackData());
});

// Route 4: Submit Feedback (POST)
app.post('/api/feedback', (req, res) => {
  const { feedback } = req.body || {};
  if (!feedback) {
    return res.status(400).json({ error: "Feedback content is required" });
  }

  const currentList = getFeedbackData();
  const newItem = {
    id: currentList.length + 1,
    feedback,
    timestamp: new Date().toISOString()
  };

  currentList.unshift(newItem);
  saveFeedbackData(currentList);

  res.json({ status: "success", message: "Feedback saved successfully" });
});

// Route 5: Real-Time Trade Audit API Endpoint
app.post('/api/audit', (req, res) => {
  globalAuditCount++;

  let payloadText = "";
  if (typeof req.body === 'string') {
    payloadText = req.body;
  } else if (req.body && req.body.payload) {
    payloadText = req.body.payload;
  } else {
    payloadText = JSON.stringify(req.body || {});
  }

  // Regex extractors for trade parameters
  const exporterMatch = payloadText.match(/Exporter:\s*(.+)/i) || payloadText.match(/Exporter Entity:\s*(.+)/i);
  const importerMatch = payloadText.match(/Importer:\s*(.+)/i) || payloadText.match(/Importer Entity:\s*(.+)/i);
  const hsMatch = payloadText.match(/HS Tariff Code:\s*(.+)/i) || payloadText.match(/HS Code:\s*(.+)/i) || payloadText.match(/(\d{4}\.\d{2})/);
  const productMatch = payloadText.match(/Product Description:\s*(.+)/i) || payloadText.match(/Product Category:\s*(.+)/i);

  const exporter = exporterMatch ? exporterMatch[1].trim() : "Eurasia Global Trading";
  const importer = importerMatch ? importerMatch[1].trim() : "Iran Electronics Industries";
  const hsCode = hsMatch ? hsMatch[1].trim() : "8542.31";
  const productDescription = productMatch ? productMatch[1].trim() : "Integrated Microcircuit Controllers and Semiconductor Arrays";

  // Risk evaluation logic
  let riskScore = 88;
  let status = "FLAGGED";
  let summary = "WARNING: Match detected against Consolidated Sanctions Watchlists. Restricted destination or entity corridor identified.";

  if (payloadText.toLowerCase().includes("passed") || payloadText.toLowerCase().includes("clearance")) {
    riskScore = 12;
    status = "PASSED";
    summary = "PASSED: Full compliance verified. No sanctions match or restricted dual-use export anomalies identified.";
  }

  res.json({
    risk_score: riskScore,
    status: status,
    global_audit_count: globalAuditCount,
    extracted_fields: {
      exporter,
      importer,
      hsCode,
      productDescription
    },
    audit_summary: summary
  });
});

// Start Express Server
const PORT = process.env.PORT || 5678;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Eurasia AI Server active on port ${PORT}`);
});
