import https from 'https';

https.get('https://www.skylinewebcams.com/en/webcam/martinique/martinique/sainte-anne/baie-sainte-anne.html', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/<meta property="og:image" content="([^"]+)"/i);
    if (match) {
      console.log('IMAGE_URL:', match[1]);
    } else {
      console.log('No image found');
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
