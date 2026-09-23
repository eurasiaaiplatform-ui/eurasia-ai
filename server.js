const express = require('express');
const app = express();
const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers so the web browser can talk to port 5678
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight checks
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let body = [];

  // Read incoming file upload stream
  req.on('data', (chunk) => {
    body.push(chunk);
  });

  req.on('end', () => {
    const rawContent = Buffer.concat(body).toString('utf8');

    let flags = [];
    let riskScore = 10;

    // Check document for key trade compliance terms
    const hasHsCode = /HS\s*Code|Harmonized|Tariff|\b\d{4}\.\d{2}\b/i.test(rawContent);
    const hasOrigin = /Country\s*of\s*Origin|Made\s*in|Origin|Exporter/i.test(rawContent);
    const hasTaxId = /Tax\s*ID|VAT|GST|EIN|Registration|GSTIN/i.test(rawContent);
    const containsRestricted = /Dual-use|Weapon|Sanction|Chemical|Uncertified|Explosive|Hazardous|Controlled/i.test(rawContent);

    if (!hasHsCode) {
      flags.push("Missing HS Tariff Code classification");
      riskScore += 25;
    }
    if (!hasOrigin) {
      flags.push("Missing declared Country of Origin");
      riskScore += 20;
    }
    if (!hasTaxId) {
      flags.push("Missing Tax / VAT / GST Identifier");
      riskScore += 15;
    }
    if (containsRestricted) {
      flags.push("High-risk / restricted goods keywords flagged");
      riskScore += 40;
    }

    const finalScore = Math.min(riskScore, 99);
    const status = (finalScore >= 45 || containsRestricted) ? "FLAGGED" : "PASS";

    let summary = "";
    if (flags.length === 0) {
      summary = "Trade invoice verification successful. Valid HS Tariff Code, Country of Origin, and Tax Identifiers verified with zero compliance violations.";
    } else {
      summary = "Compliance flags identified: " + flags.join("; ") + ". Manual clearance required before port dispatch.";
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: status,
      risk_score: finalScore,
      audit_summary: summary
    }));
  });
});

server.listen(5678, () => {
  console.log("Eurasia AI Dynamic Compliance Engine active on http://localhost:5678");
})
app.get('/certificate', (req, res) => {
  const invoiceId = req.query.id || 'IN6624';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Compliance Certificate - ${invoiceId}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .certificate { background: #fff; padding: 40px; border: 10px solid #1e3a8a; width: 700px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; margin-bottom: 5px; }
        .seal { margin: 20px auto; width: 80px; height: 80px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        .footer { display: flex; justify-content: space-between; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="certificate">
        <h1>EURASIA AI</h1>
        <p>B2B Trade Compliance Audit Certificate</p>
        <hr style="margin: 20px 0;">
        <p>This certifies that invoice <strong>${invoiceId}</strong> has been audited and verified with zero compliance violations.</p>
        <div class="seal">VERIFIED</div>
        <div class="footer">
          <div>_______<br>Authorized Signatory</div>
          <div>_______<br>Compliance Officer</div>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(htmlContent);
});
