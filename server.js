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


const checkCache = async (req,res,next) =>{
  const url = req.params.url;
  const cacheResults = await redisClient.get(url);
  if(cacheResults)
  {
    console.log('sending from cache');
    return res.json(JSON.parse(cacheResults));
  } else {
    next();
  }
}

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
  redisClient.setEx(url,5*24*3600, JSON.stringify(shortUrl));
  shortUrl.clicks++;
  shortUrl.save();

  res.redirect(shortUrl.full);
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});