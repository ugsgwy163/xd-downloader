const scrapy = require('../lib/scrapy');
const urls = require('./urls');
const log = require('../lib/log');

const run = async () => {
  if (urls.length > 0) {
    for (const url of urls) {
      if (url.trim().length > 0) {
        const info = await scrapy.findDownloadInfo(url);
        const result = await scrapy.downloadVideo(info);
        log.info(result);
        console.log('\n');
      }
    }
  } else {
    console.log('nothing to do..');
  }
};

run();
