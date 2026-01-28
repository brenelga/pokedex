import NodeCache from 'node-cache';

// Standard TTL 10 minutes, check for expired keys every 2 minutes
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export default cache;
