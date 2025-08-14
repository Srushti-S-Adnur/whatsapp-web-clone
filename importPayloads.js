require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/Message');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected for import'))
.catch(err => {
  console.error('❌ Connection error:', err);
  process.exit(1);
});

const payloadsDir = path.join(__dirname, 'payloads');

fs.readdir(payloadsDir, async (err, files) => {
  if (err) {
    console.error('Error reading payloads folder:', err);
    process.exit(1);
  }

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(payloadsDir, file);
        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        // Navigate to the messages array
        const entry = jsonData.metaData?.entry?.[0];
const change = entry?.changes?.[0];
const messages = change?.value?.messages || [];
const statuses = change?.value?.statuses || [];
const contactName = change?.value?.contacts?.[0]?.profile?.name || null;
const contactWaId = change?.value?.contacts?.[0]?.wa_id || null;

if (messages.length > 0) {
  // Handle normal messages
  for (const msg of messages) {
    await Message.create({
      msg_id: msg.id || `local_${Date.now()}`,
      meta_msg_id: null,
      wa_id: contactWaId || msg.from || null,
      from: msg.from || null,
      to: contactWaId || null,
      text: msg.text?.body || '',
      type: msg.type || 'text',
      timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
      status: 'unknown',
      raw: {
        ...msg,
        contact_name: contactName
      }
    });
  }
  console.log(`✅ Imported ${messages.length} messages from ${file} (Contact: ${contactName || 'Unknown'})`);
} else if (statuses.length > 0) {
  // Handle status updates
  for (const stat of statuses) {
    await Message.create({
      msg_id: stat.id || `status_${Date.now()}`,
      meta_msg_id: stat.meta_msg_id || null,
      wa_id: stat.recipient_id || null,
      from: null,
      to: stat.recipient_id || null,
      text: '',
      type: 'status',
      timestamp: stat.timestamp ? new Date(stat.timestamp * 1000) : new Date(),
      status: stat.status || 'unknown',
      raw: stat
    });
  }
  console.log(`📩 Imported ${statuses.length} status updates from ${file}`);
} else {
  console.warn(`⚠ No messages or statuses found in ${file}`);
}


      } catch (error) {
        console.error(`❌ Error importing ${file}:`, error);
      }
    }
  }

  console.log('🎯 Import completed');
  mongoose.disconnect();
});
