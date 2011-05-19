// under redevelopment to cater for Twitter's idiocy by limiting xAuth...
// This does not scrape out the PIN. It get the verifier token from the failed callback in the webView.
// We register http://127.0.0.21 as the callback URL for a browser-based OAuth client instead.

// this is unfinished and messy at the moment. 


// I'll be changing it to use App.Properties rather than write a text file.config too.. 


// /me shakes fist at Twitter..!!! grrrrr....!!!

Ti.include('sha1.js');
Ti.include('oauth.js');
var url_string = null;

function findUrl(s){
	var hlink = /(ht|f)tp:\/\/([^ \,\;\:\!\)\(\"\'\<\>\f\n\r\t\v])+/g;
		return (s.replace (hlink, function ($0,$1,$2) { s = $0.substring(0,$0.length);
			while (s.length>0 && s.charAt(s.length-1)=='.')
				s=s.substring(0,s.length-1);
				//var the_link = '<a style="color:#546F8A;font-weight:bold;text-decoration:none;" href="javascript:web(\''+s+'\')">'+s+'</a>';
				var the_url = s;
				url_string = the_url;
				return the_url;
				
			}
		)
	);
}
	
// create an OAuthAdapter instance
var OAuthAdapter = function(pConsumerSecret, pConsumerKey, pSignatureMethod)
 {

    // will hold the consumer secret and consumer key as provided by the caller
    var consumerSecret = pConsumerSecret;
    var consumerKey = pConsumerKey;

    // will set the signature method as set by the caller
    var signatureMethod = pSignatureMethod;

    // the pin or oauth_verifier returned by the authorization process window
    var pin = null;

    // will hold the request token and access token returned by the service
    var requestToken = null;
    var requestTokenSecret = null;
    var accessToken = null;
    var accessTokenSecret = null;

    // the accessor is used when communicating with the OAuth libraries to sign the messages
    var accessor = {
        consumerSecret: consumerSecret,
        tokenSecret: ''
    };

    // holds actions to perform
    var actionsQueue = [];

    // will hold UI components
    var window = null;
    var view = null;
    var webView = null;
    var receivePinCallback = null;


	

    this.loadAccessToken = function(pService)
    {
        Ti.API.info('Loading access token for service [' + pService + '].');

        var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        if (!file.exists){
        	return;
		}
        var contents = file.read();
        if (contents == null){
        	return;
        }

        try
        {
            var config = JSON.parse(contents.text);
        }
        catch(ex)
        {
            return;
        }
        if (config.accessToken) {
        	accessToken = config.accessToken;
        }
        if (config.accessTokenSecret) {
        	accessTokenSecret = config.accessTokenSecret;
		}
        Ti.API.info('Loading access token: done [accessToken:' + accessToken + '][accessTokenSecret:' + accessTokenSecret + '].');
    };
    this.saveAccessToken = function(pService)
    {
        Ti.API.info('Saving access token [' + pService + '].');
        Ti.API.info('Saving access token: [accessToken:' + accessToken + '][accessTokenSecret:' + accessTokenSecret + '].');
        
        var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        if (file == null) {
        	file = Ti.Filesystem.createFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        }
        file.write(JSON.stringify(
        {
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret
        }
        ));
        Ti.API.info('Saving access token: done.');
    };

    // will tell if the consumer is authorized
    this.isAuthorized = function()
    {
        return ! (accessToken == null || accessTokenSecret == null);
    };

    // creates a message to send to the service
    var createMessage = function(pUrl, method)
    {
        var message = {
            action: pUrl ,
            method: (method) ? method : 'POST' ,
            parameters: []
        };
        message.parameters.push(['oauth_consumer_key', consumerKey]);
        message.parameters.push(['oauth_signature_method', signatureMethod]);
        return message;
    };

    // returns the pin
    this.getPin = function() {
        return pin;
    };

    // requests a requet token with the given Url
    this.getRequestToken = function(pUrl)
    {
        accessor.tokenSecret = '';

        var message = createMessage(pUrl);
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var client = Ti.Network.createHTTPClient();
        client.open('POST', pUrl, false);
        client.send(OAuth.getParameterMap(message.parameters));

        var responseParams = OAuth.getParameterMap(client.responseText);
        requestToken = responseParams['oauth_token'];
        requestTokenSecret = responseParams['oauth_token_secret'];

        Ti.API.debug('request token got the following response: ' + client.responseText);

        return client.responseText;
    };

    // unloads the UI used to have the user authorize the application
    var destroyAuthorizeUI = function()
    {
        Ti.API.info('destroyAuthorizeUI');
        // if the window doesn't exist, exit
        if (window == null){
        	return;
		}
        // remove the UI
        try
        {
        
	        webView.removeEventListener('load', authorizeUICallback);
        	var t5 = Titanium.UI.create2DMatrix();
			t5 = t5.scale(0);
			window.close({transform:t5,duration:300});	
		
	        Ti.API.debug('destroyAuthorizeUI:webView.removeEventListener');
	        Ti.API.debug('destroyAuthorizeUI:window.close()');

        }
        catch(ex)
        {
            Ti.API.info('Cannot destroy the authorize UI. Ignoring.');
        }
    };

    // looks for the PIN everytime the user clicks on the WebView to authorize the APP
    // currently works with TWITTER
    var authorizeUICallback = function(e)
    {
        Ti.API.info('authorizeUILoaded');
	
		//Ti.API.info(e.source.html);
	

    };

    // shows the authorization UI
    this.showAuthorizeUI = function(pUrl, pReceivePinCallback)
    {
        receivePinCallback = pReceivePinCallback;

       // window = Ti.UI.createWindow({
            //modal: true,
            //fullscreen: true
       // });
        var transform = Ti.UI.create2DMatrix().scale(0);
        
        /*
        view = Ti.UI.createWindow({
            top: 5,
            width: 310,
            height: 450,
            border: 10,
            backgroundColor: '#58b4d6',
            borderColor: '#eee',
            borderRadius: 6,
            borderWidth: 3,
            zIndex: -1,
            transform: transform
        });
        */
        
 		window = Ti.UI.createWindow({
			backgroundColor:'#ffffff',
            top:5,
            width:310,
            height:450,
			borderWidth:8,
			borderColor:'#136ca4',		
			borderRadius:6,
			transform:transform
		});
		
        closeLabel = Ti.UI.createLabel({
            textAlign: 'right',
            font: {
                fontWeight: 'bold',
                fontSize: '14'
            },
            text: 'Close  X ',
            top: 10,
            right: 12,
            height: 14
        });
       // window.open();

        webView = Ti.UI.createWebView({
        	top:30,
            url: pUrl
        });

		webView.addEventListener('error',function(e){
			// look for the failed call to the non-existent callBack URL
			findUrl(e.message);
			
			
			if(url_string!=null){
				Ti.API.info('OK. Could not get to : '+url_string);
				Ti.API.info('This is a good error ;) .. now parse it');
								
				var uParams = url_string.split('?')[1].split('&');
				
				Ti.API.info(uParams);
				var the_oauth_token = uParams[0].split('=')[1];				
				Ti.API.info('the_oauth_token : '+the_oauth_token);
				// this is the one we want to send back to get an access token.. 
				var the_oauth_verifier = uParams[1].split('=')[1];				
				Ti.API.info('the_oauth_verifier : '+the_oauth_verifier);	
				pin = the_oauth_verifier;
				
				// next, get the access token and store it.
            	if(receivePinCallback){
            		setTimeout(receivePinCallback, 100);
				}
                id = null;
                node = null;

                //destroyAuthorizeUI();
                
				
			}
			//Ti.API.info(access_token_url_string);
			
		});
		
		webView.addEventListener('beforeload',function(e){
			
			Ti.API.info('WEBVIEW URL REQUEST TO : '+e.url);
			
		});	
	

		//Ti.API.info('Setting:['+Ti.UI.AUTODETECT_NONE+']');

        closeLabel.addEventListener('click', destroyAuthorizeUI);
        window.add(closeLabel);
        
        webView.addEventListener('load', authorizeUICallback);
        window.add(webView);

       // window.add(view);

        //var animation = Ti.UI.createAnimation();
        //animation.transform = Ti.UI.create2DMatrix();
        //animation.duration = 200;
        //view.animate(animation);
 		// create first transform to go beyond normal size
		var t1 = Titanium.UI.create2DMatrix();
		t1 = t1.scale(1.1);
		var a = Titanium.UI.createAnimation();
		a.transform = t1;
		a.duration = 200;

		a.addEventListener('complete', function()
		{
			//Titanium.API.info('here in complete');
			var t2 = Titanium.UI.create2DMatrix();
			t2 = t2.scale(1.0);
			window.animate({transform:t2, duration:200});
	
		});       
        
        window.open(a);
        
    };

    this.getAccessToken = function(pUrl)
    {
        accessor.tokenSecret = requestTokenSecret;

        var message = createMessage(pUrl);
        message.parameters.push(['oauth_token', requestToken]);
        message.parameters.push(['oauth_verifier', pin]);

        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var parameterMap = OAuth.getParameterMap(message.parameters);
        for (var p in parameterMap){
	    	if(p){
	    		Ti.API.info(p + ': ' + parameterMap[p]);
	    	}
		}
        var client = Ti.Network.createHTTPClient();
        client.open('POST', pUrl, false);
        client.send(parameterMap);

        var responseParams = OAuth.getParameterMap(client.responseText);
        accessToken = responseParams['oauth_token'];
        accessTokenSecret = responseParams['oauth_token_secret'];

        Ti.API.debug('*** get access token, Response: ' + client.responseText);

        processQueue();

        return client.responseText;

    };

    var processQueue = function()
    {
        Ti.API.debug('Processing queue.');
        while ((q = actionsQueue.shift()) != null){
	        send(q);
		}
        Ti.API.debug('Processing queue: done.');
    };
    var oauthParams = "OAuth realm,oauth_version,oauth_consumer_key,oauth_nonce,oauth_signature,oauth_signature_method,oauth_timestamp,oauth_token".split(',');
    var makeAuthorizationHeaderString = function(params) {
        var str = ''; 
        for (var i = 0, len = oauthParams.length; i < len ; i++) {
            var key = oauthParams[i];
            if (params[key] != undefined) {
            	str += key + '="' + encodeURIComponent(params[key]) + '",';
            }
        }
        Ti.API.info('authorization header string : ' + str);
        return str;
    };

    var removeOAuthParams = function(parameters) {
        var checkString = oauthParams.join(',') + ',';
        for (var p in parameters) {
        	if(p){
           		if(checkString.indexOf(p + ",") >= 0){
           			delete parameters[p];
           		}
			}          
        }
    };

    var makePostURL = function(url,parameters) {
        var checkString = oauthParams.join(',') + ',';
        var query = [];
        var newParameters = [];
        for (var i = 0 , len = parameters.length; i < len ; i++) {
           var item = parameters[i];
           if (checkString.indexOf(item[0] + ",") < 0) {
                query.push(encodeURIComponent(item[0]) + "=" + encodeURIComponent(item[1])); 
           } else {
               newParameters.push[item];
           }
        }
        parameters = newParameters;
        if (query.length) {
            query = query.join('&');
            return [url + ((url.indexOf('?') >= 0) ? '&' : '?') + query, parameters];
        } else {
            return [url, parameters];
        }
    };
    var makeGetURL = function(url, parameterMap) {
        var query = [];
        var keys = [];
        for (var p in parameterMap) {
        	if(p){
        		query.push( encodeURIComponent(p) + "=" + encodeURIComponent(parameterMap[p]));
        	}
        }
				query.sort();//(9.1.1.  Normalize Request Parameters)
        if (query.length) {
            query = query.join('&');
            return url + ((url.indexOf('?') >= 0) ? '&' : '?') + query;
        } else {
            return url;
        }
    };

    var send = function(params) {
        var pUrl            = params.url;
        var pParameters     = params.parameters || [];
        var pTitle          = params.title;
        var pMethod         = params.method || "POST";
        var resultByXML      = params.resultByXML || false;

        Ti.API.debug('Sending a message to the service at [' + pUrl + '] with the following params: ' + JSON.stringify(pParameters));
        if (accessToken == null || accessTokenSecret == null)
        {
            Ti.API.info('The send status cannot be processed as the client doesn\'t have an access token. The status update will be sent as soon as the client has an access token.');
            actionsQueue.push(params);
            return;
        }

        accessor.tokenSecret = accessTokenSecret;
        var message = createMessage(pUrl, pMethod);
        message.parameters.push(['oauth_token', accessToken]);
        for (p in pParameters){
        	if(p){
        		message.parameters.push(pParameters[p]);
        	}
        }
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);
        var parameterMap = OAuth.getParameterMap(message.parameters);
        for (var p in parameterMap){
   			if(p){
        		Ti.API.info(p + ': ' + parameterMap[p]);
        	}
        }
        if (pMethod == "GET") {
            pUrl = makeGetURL(pUrl, parameterMap);
            parameterMap = null;
            Ti.API.info('url for GET:'+pUrl);
        }
        var client = Ti.Network.createHTTPClient();
        client.onerror = function(e){
          Ti.API.info(e);
          if(params.onError){
            params.onError(e);
          }
        };
        client.onload = function(){
          Ti.API.info('*** sendStatus, Response: [' + client.status + '] ' + client.responseText);
          if ((""+client.status).match(/^20[0-9]/)) {
            if(params.onSuccess){
              params.onSuccess(client.responseText);
            }
          } else {
            if(params.onError){
              params.onError({error:'[' + client.status + '] ' + client.responseText});
            }
          }
        };
        client.open(pMethod, pUrl, false);
        client.send(parameterMap);

        return null;
    };
    this.send = send;
};
