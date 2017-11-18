const fse = require('fs-extra');
const cheerio = require('cheerio');
const request = require('request');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const progress = require('request-progress');

const config = require('../config.json');
const utils = require('./utils');
const log = require('./log');
const bar = require('./bar');

const baseUrl = 'https://www.pornhub.com';
const hds = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
};
const baseReqOpts = {
  headers: hds
};
// proxy
if (config.proxyUrl.trim().length > 0) {
  baseReqOpts.proxy = config.proxyUrl.trim();
}
// timeout
if (config.timeout > 0) {
  baseReqOpts.timeout = config.timeout;
}

const findKeys = (opts) => {
  const pm = new Promise((resolve, reject) => {
    let pageUrl = baseUrl;
    let queryObj = {};
    if (opts) {
      if (opts.search && opts.search.trim().length > 0) {
        pageUrl = `${baseUrl}/video/search`;
        queryObj.search = opts.search.trim();
      }

      if (opts.page && opts.page > 1) {
        queryObj.page = opts.page;
      }
    }
    let reqOpts = {
      url: pageUrl,
      qs: queryObj
    };
    Object.assign(reqOpts, baseReqOpts);

    request(reqOpts, (err, res, body) => {
      if (err) {
        return reject(err);
      }

      const $ = cheerio.load(body);
      const keys = [];
      $('.videoblock.videoBox').each((idx, element) => {
        const key = element.attribs['_vkey'];
        keys.push(key);
      });

      return resolve(keys);
    });
  });

  return pm;
};

const findTitle = (bodyStr) => {
  const $ = cheerio.load(bodyStr);
  const title = $('title').text();
  const arr = title.split('-');
  arr.pop();

  return arr.join('-');
};

const parseDownloadInfo = (bodyStr) => {
  let info;
  const idx = bodyStr.indexOf('mediaDefinitions');

  if (idx < 0) {
    return info;
  }

  let begin, end;
  for (let i = idx; i < bodyStr.length; i++) {
    const tmpStr = bodyStr.substr(i, 1);
    if (tmpStr === '[') {
      begin = i;
    }

    if (tmpStr === ']') {
      end = i;
      break;
    }
  }

  if (begin >=0 && end >= 0) {
    const jsonStr = bodyStr.substring(begin, end + 1);
    let arr = JSON.parse(jsonStr);
    arr = _.filter(arr, item => {
      return item.videoUrl.length > 0;
    });
    arr = _.orderBy(arr, 'quality', 'desc');
    if (arr.length > 0) {
      info = arr[0];
      info.title = findTitle(bodyStr);
    }
  }

  return info;
};

const findDownloadInfo = (key) => {
  const pm = new Promise((resolve, reject) => {
    let pageUrl = `https://www.pornhub.com/view_video.php?viewkey=${key}`;
    if (key.startsWith('http')) {
      pageUrl = key;
    }
    let opts = {
      url: pageUrl
    };
    Object.assign(opts, baseReqOpts);
    request(opts, (err, res, body) => {
      if (err) {
        return reject(err);
      }

      return resolve(parseDownloadInfo(body));
    });
  });

  return pm;
};

const downloadVideo = (ditem) => {
  let filename = moment().format('YYYYMMDD');
  if (ditem.title && ditem.title.trim().length > 0) {
    filename = ditem.title.trim();
  }
  filename += `_${ditem.quality}P.mp4`;
  filename = utils.clearFileName(filename);
  const dir = config.downloadDir || './downloads';
  if (!fse.existsSync(dir)) {
    fse.mkdirpSync(dir);
  }
  const dst = path.join(dir, filename);

  const pm = new Promise((resolve, reject) => {
    if (fse.existsSync(dst)) {
      return resolve(`${dst} already exists!`);
    }
    let opts = {
      url: ditem.videoUrl
    };
    Object.assign(opts, baseReqOpts);
    log.verbose(`downloading > ${filename}`);
    progress(request(opts))
      .on('progress', state => {
        bar.show(state.percent, state.speed);
      })
      .on('error', err => {
        return reject(err);
      })
      .on('end', () => {
        bar.done();
        return resolve(`${dst} has been downloaded!`);
      })
      .pipe(fse.createWriteStream(dst))
      .on('error', err => {
        return reject(err);
      });
  });

  return pm;
};

module.exports = {
  findKeys,
  findDownloadInfo,
  downloadVideo
};
