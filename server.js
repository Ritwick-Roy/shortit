const express = require('express');
const connectDB = require('./config/db');
const ShortUrl = require('./models/shortUrl');
const app = express();
const redis = require("redis");
const PORT = process.env.PORT || 5000;

connectDB();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

const checkCache = async (req, res, next) => {
  const url = req.params.url;

  try {
    const cacheResults = await redisClient.get(url);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    }
    next();
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

app.get('/', async (req, res) => {
  const shortUrls = await ShortUrl.find();
  res.render('index', { shortUrls: shortUrls });
});

app.post('/shortUrls', async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl });

  res.redirect('/');
});

app.get('/:shortUrl', checkCache, async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
  if (shortUrl == null)
    return res.sendStatus(404);

  shortUrl.clicks++;
  shortUrl.save();

  res.redirect(shortUrl.full);
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});