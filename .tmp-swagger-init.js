
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "customOptions": {
    "filter": true,
    "withCredentials": true,
    "persistAuthorization": true,
    "urls": [
      {
        "url": "/api/docs/member2-openapi.bundle.yaml?v=20260402",
        "name": "Member 2 Project APIs"
      },
      {
        "url": "/api/docs/member3-openapi.bundle.yaml?v=20260402",
        "name": "Member 3 Job and Recruiter APIs"
      },
      {
        "url": "/api/docs/member4-openapi.bundle.yaml?v=20260402",
        "name": "Member 4 Admin, Auth and Doubt APIs"
      },
      {
        "url": "/api/docs/member5-openapi.bundle.yaml?v=20260402",
        "name": "Member 5 Platform Admin APIs"
      }
    ],
    "urls.primaryName": "Member 2 Project APIs"
  }
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}

