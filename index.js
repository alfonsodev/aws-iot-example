'use strict'
const AWS_REGION       = 'eu-west-1'
const IDENTITY_POOL_ID = 'eu-west-1:00000000-0000-0000-0000-000000000000'
const DOMAIN           = 'domain.com'
const IOT_HOST         = '0000000000000.iot.eu-west-1.amazonaws.com'
const CLIENT_ID        = '123'
const UID              = 'aaaaaaaa-bbbb-cccc-dddd-wwwwwwwwwwww'; 

var AWS              = require('aws-sdk')
var awsIot           = require('aws-iot-device-sdk');
var cognitoidentity  = new AWS.CognitoIdentity()
AWS.config.logger    = 'process.stdout'



var connectDeviceWithCredentials = function(cred) {
  var device = awsIot.device({
		clientId     : CLIENT_ID,
		region       : AWS_REGION,
		debug        : true,
		host         : IOT_HOST,
		protocol     : 'wss',
		sessionToken : '',
		accessKeyId  : '',
		secretKey    : '',
  })

  device.updateWebSocketCredentials(cred.AccessKeyId, cred.SecretKey, cred.SessionToken, cred.Expiration)

  device.on('connect', function(err, data) {
  	if (err) {
	    console.log(`Connection Error: ${err}`);
	    return;
  	}
    console.log('connected!');
    device.subscribe(`$aws/things/${CLIENT_ID}/shadow/update`);
    device.on('message', (topic, payload) => {
      console.log('message', topic, payload.toString());
    });
		device.on('error', (e) => {
			console.log(`Device Error event: ${e}`)
		})
  });
}

var createIdentity = function(uid) {
	return new Promise(function(resolve, reject) {
		var params = {
		  IdentityPoolId: IDENTITY_POOL_ID, /* required */
		  Logins: { },
		  TokenDuration: 60 * 60 * 24  
		};

		params.Logins[DOMAIN] = uid
		cognitoidentity.getOpenIdTokenForDeveloperIdentity(params, function(err, data) {
		  if (err) reject(err); 
		  else     resolve(data);
		});
	})
}

var getCredentials = function(indeittyId, customRoleArn, login) {
	return new Promise(function(resolve, reject) {
		var params = {
			IdentityId    : indeittyId,
			CustomRoleArn : customRoleArn,
			Logins        : {
				'cognito-identity.amazonaws.com': login,
			}
		};
		cognitoidentity.getCredentialsForIdentity(params, function(err, data) {
		  if (err) reject(err)
		  else     resolve(data)
		});
	})
}

createIdentity(UID).then((data) => {
	console.log(`indentity id: %s`, data.IdentityId)
	getCredentials(data.IdentityId, null, data.Token).then((data) => {
		console.log(`Credentials: %j`, data.Credentials)
		try {
			connectDeviceWithCredentials(data.Credentials)
		} catch(e) {
			console.log(`Error: %s`, e) 
		}
	})
})
.catch((err) => {
	console.log(err)
})
