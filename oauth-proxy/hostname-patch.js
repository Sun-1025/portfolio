// Preload patch: Vercel CLI crashes when the machine hostname contains
// non-ASCII characters (Windows "薰衣草的电脑" -> ByteString error in HTTP headers).
// Overriding os.hostname() to an ASCII placeholder fixes the crash.
const os = require('os');
os.hostname = () => 'localhost';
