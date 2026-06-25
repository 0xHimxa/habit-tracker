import http from 'http';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
  path: '/health',
  timeout: 3000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.end();
