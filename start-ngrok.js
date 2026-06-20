const ngrok = require('ngrok');

(async function() {
  try {
    // Kill any existing ngrok processes first
    await ngrok.kill();
    
    // Set authtoken from config file
    await ngrok.authtoken('3AqLbXPc8UgnIQ0FeFvWDnBmEG1_Y1FSJe8Gum4TkHqk6ZCd');

    // Start frontend tunnel for port 5173
    const frontendUrl = await ngrok.connect({
      proto: 'http',
      addr: 5173
    });
    console.log('Frontend tunnel URL:', frontendUrl);

    // Start backend tunnel for port 5001
    const backendUrl = await ngrok.connect({
      proto: 'http',
      addr: 5001
    });
    console.log('Backend tunnel URL:', backendUrl);

  } catch (error) {
    console.error('Error starting ngrok:', error);
    await ngrok.kill();
    process.exit(1);
  }
})();
