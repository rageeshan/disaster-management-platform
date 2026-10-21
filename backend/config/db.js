import mongoose from 'mongoose';
import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`⚠️ Database Connection Error: ${error.message}`);
      retries -= 1;
      if (retries === 0) {
        console.error('❌ Could not connect to MongoDB after multiple attempts.');
        process.exit(1);
      } else {
        console.log(`Retrying DB connection in 2 seconds... (${retries} attempts left)`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }
};

export default connectDB;