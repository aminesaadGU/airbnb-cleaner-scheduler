const express = require('express');
const bodyParser = require('body-parser');
const scheduler = require('./services/cleanerScheduler');

const app = express();
app.use(bodyParser.json());

// In-memory stores for MVP
const bookings = [];
const cleaners = [];

app.get('/health', (req, res) => res.json({status: 'ok'}));

app.get('/api/bookings', (req, res) => res.json(bookings));
app.get('/api/cleaners', (req, res) => res.json(cleaners));

// Register a cleaner (simple availability model)
app.post('/api/cleaners', (req, res) => {
  const {id, name, zones, capacityPerDay = 2} = req.body;
  if (!id || !name) return res.status(400).json({error: 'id and name required'});
  const existing = cleaners.find(c => c.id === id);
  if (existing) return res.status(400).json({error: 'cleaner already exists'});
  const cleaner = {id, name, zones: zones || [], capacityPerDay};
  cleaners.push(cleaner);
  res.status(201).json(cleaner);
});

// Create a booking (this would normally be called by an Airbnb webhook)
app.post('/api/bookings', (req, res) => {
  const {id, listing, startDate, endDate, guests, zone} = req.body;
  if (!id || !listing || !startDate || !endDate) return res.status(400).json({error: 'missing fields'});
  const booking = {id, listing, startDate, endDate, guests, zone, status: 'pending', assignedCleaner: null};
  bookings.push(booking);

  // Attempt to schedule immediately
  const assigned = scheduler.assignCleaner(booking, cleaners, bookings);
  if (assigned) {
    booking.status = 'assigned';
    booking.assignedCleaner = assigned.id;
  }

  res.status(201).json(booking);
});

// Manual dispatch endpoint
app.post('/api/dispatch/:bookingId', (req, res) => {
  const {bookingId} = req.params;
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return res.status(404).json({error: 'booking not found'});
  const assigned = scheduler.assignCleaner(booking, cleaners, bookings);
  if (!assigned) return res.status(400).json({error: 'no available cleaner'});
  booking.status = 'assigned';
  booking.assignedCleaner = assigned.id;
  res.json(booking);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`airbnb-cleaner-scheduler running on ${PORT}`));
