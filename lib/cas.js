
/*!
 * node-casv2
 * Copyright(c) 2011 Chris Song <fakechris@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var https = require('https');
var url = require('url');
var xml = require('xml2js');

/**
 * Initialize CAS with the given `options`.
 *
 * @param {Object} options
 * @api public
 */
var CAS = module.exports = function CAS(options) {
  options = options || {};

  if (!options.base_url) {
    throw new Error('Required CAS option `base_url` missing.');
  }

  if (!options.service) {
    throw new Error('Required CAS option `service` missing.');
  }

  var cas_url = url.parse(options.base_url);
  if (cas_url.protocol != 'https:') {
    throw new Error('Only https CAS servers are supported.');
  } else if (!cas_url.hostname) {
    throw new Error('Option `base_url` must be a valid url like: https://example.com/cas');
  } else {
    this.hostname = cas_url.host;
    this.port = cas_url.port || 443;
    this.base_path = cas_url.pathname;
  }

  this.service = options.service;
};

/**
 * Library version.
 */

CAS.version = '0.1.0';

/**
 * Attempt to validate a given ticket with the CAS server.
 * `callback` is called with (err, auth_status, username)
 *
 * @param {String} ticket
 * @param {Function} callback
 * @param {rejectUnauthorized} rejectUnauthorized
 * @api public
 */

CAS.prototype.validate = function(ticket, callback, rejectUnauthorized) {
  if (typeof rejectUnauthorized === 'undefined') { rejectUnauthorized = true; }
  var req = https.get({
    host: this.hostname,
    port: this.port,
    rejectUnauthorized: rejectUnauthorized,
    path: url.format({
      pathname: this.base_path+'/serviceValidate',
      query: {ticket: ticket, service: this.service}
    })
  }, function(res) {
    // Handle server errors
    res.on('error', function(e) {
      callback(e);
    });

    // Read result
    res.setEncoding('utf8');
    var response = '';
    res.on('data', function(chunk) {
      response += chunk;
    });

    res.on('end', function() {
      xml.parseString(response, function(err, result) {
        if (!err) {
          if (result['cas:serviceResponse']['cas:authenticationSuccess']) {
			var user = {}, authsuccess = result['cas:serviceResponse']['cas:authenticationSuccess'][0];
			user.username = authsuccess['cas:user'][0]
			attributes = authsuccess['cas:attributes'][0]
			for(attr in attributes){
			  user[attr.match(/cas:(.+)/)[1]] = attributes[attr]
			}
            callback(undefined, true, user);
            return;
          } else if (result['cas:serviceResponse']['cas:authenticationFailure']) {
            callback(undefined, false);
            return;
          }
        }
      });

      // Format was not correct, error
      callback({message: 'Bad response format.'});
    });
  });
};
