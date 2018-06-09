const assert = require('assert')
const request = require('supertest')

const app = require('../app.js')

describe('GET /login', function() {
  it('responds with 200 and HTML page', function(done) {
    request(app)
      .get('/login')
      .set('Accept', 'text/html')
      .expect(200, done);
  });
});
