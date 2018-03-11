const scrapy = require('./lib/scrapy');
const config = require('./config.json');
const log = require('./lib/log');

const run = async () => {
  let page = config.page || 1;
  let search = config.search;

  try {
    while (true) {
      const opts = {
        page,
        search,
        pathname: config.pathname
      };
      const keys = await scrapy.findKeys(opts);
      if (!keys || keys.length === 0) {
        throw new Error('find nothing!');
      }

      for (const key of keys) {
        const info = await scrapy.findDownloadInfo(key);
        const result = await scrapy.downloadVideo(info);
        log.info(result);
        console.log('\n');
      }

      page += 1;
    }
  } catch (error) {
    console.log(error);
    process.exit(0);
  }
};

run();
