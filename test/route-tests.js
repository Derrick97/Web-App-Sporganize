const assert = require('assert')
const request = require('supertest')

const app = require('../App.js')

describe('GET /', function() {
  it('responds with 200 and HTML page', function(done) {
    request(app)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200, done);
  });
});
