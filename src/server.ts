//server.ts
import dotenv from 'dotenv';
dotenv.config();

import { buildFastify } from './app';
import config  from './config/config';

const app = buildFastify();

async function start() {
  try {
    await app.ready();
    
    // Render provides PORT via env variable
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ 
      port, 
      host // Important: Must be 0.0.0.0 for Render
    });
    
    app.log.info(`🚀 Server running on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
const signals = ['SIGTERM', 'SIGINT'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, closing server...`);
    await app.close();
    process.exit(0);
  });
});

//Development
// import dotenv from 'dotenv';
// dotenv.config();

// import { buildFastify } from './app';
// import config  from './config/config';

// const app = buildFastify();

// async function start() {
//   try {
//     // Ensure server is ready before listening
//     await app.ready();
    
//     await app.listen({ 
//       port: Number(config.port), 
//       host: '0.0.0.0' 
//     });
    
//     app.log.info(`Server running on port ${config.port}`);
//   } catch (err) {
//     app.log.error(err);
//     process.exit(1);
//   }
// }

// start();

// // Graceful shutdown
// const signals = ['SIGTERM', 'SIGINT'];
// signals.forEach((signal) => {
//   process.on(signal, async () => {
//     app.log.info(`Received ${signal}, closing server gracefully`);
//     await app.close();
//     process.exit(0);
//   });
// });
