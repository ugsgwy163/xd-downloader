const expect = require('chai').expect;
const utils = require('../lib/utils');

describe('utils test', () => {
  const str = 'test/and\\test/and\\test.mp4';

  it('# string no /', () => {
    expect(utils.clearFileName(str).indexOf('/')).to.equal(-1);
  });

  it('# string no \\', () => {
    expect(utils.clearFileName(str).indexOf('\\')).to.equal(-1);
  });
});
