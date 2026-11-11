const http = require('http');
const fs = require('fs');

async function testUpload() {
  const token = 'eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJ0ZXN0dXNlcl8xNzkzODIyMzA0Mjg2IiwiaWF0IjoxNzkzODIyMzEyLCJleHAiOjE3OTM4MjU5MTJ9.V_HVrjDLa6QkfY6lMFkcWyNjTScGfsqPJ3SzJExAK9jJ9rW_OrciyoXmwobW_i4C';
  
  const boundary = '--------------------------1234567890';
  const fileContent = 'Artificial intelligence is transforming software engineering and modern document search.';
  const filename = 'sample_document.txt';

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
  body += `Content-Type: text/plain\r\n\r\n`;
  body += `${fileContent}\r\n`;
  body += `--${boundary}--\r\n`;

  const req = http.request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/v1/documents/upload',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body)
    }
  }, res => {
    let resBody = '';
    res.on('data', chunk => resBody += chunk);
    res.on('end', () => {
      console.log('Upload response status:', res.statusCode);
      console.log('Upload response body:', resBody);
    });
  });

  req.on('error', console.error);
  req.write(body);
  req.end();
}

testUpload();

