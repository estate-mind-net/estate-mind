const fs = require('fs');
const p = 'c:/CODE/ESTATEMIND/estatemind/src/services/opportunityHunter/connectors/LiveScraperConnector.ts';
const s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(p, s.replace(/\r\n/g, '\n'), 'utf8');
console.log('Converted to LF, new length:', fs.readFileSync(p, 'utf8').length);
