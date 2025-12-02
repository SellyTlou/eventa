// Simple test script to POST to query.php and validate JSON
// Usage: node scripts/test-query.js

const url = 'http://localhost/eventa/src/pages/php/query.php';

async function runTest() {
  try {
    const params = new URLSearchParams();
    params.append('function', 'getAllPackages');

    const res = await fetch(url, { method: 'POST', body: params });
    const raw = await res.text();

    console.log('HTTP status:', res.status);
    console.log('Raw response length:', raw.length);

    try {
      const json = JSON.parse(raw);
      console.log('Parsed JSON OK:', json.success !== undefined ? 'has success field' : 'no success field');
    } catch (err) {
      console.error('JSON parse failed:', err.message);
      console.log('Raw response (first 400 chars):\n', raw.slice(0, 400));
      process.exit(2);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(1);
  }
}

runTest();