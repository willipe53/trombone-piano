function handler(event) {
  var request = event.request
  var host = request.headers.host && request.headers.host.value
  if (host !== 'www.trombonepiano.com') return request

  var pairs = []
  var params = request.querystring || {}
  for (var key in params) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) continue
    var entry = params[key]
    if (entry.multiValue) {
      for (var i = 0; i < entry.multiValue.length; i++) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.multiValue[i].value))
      }
    } else if (entry.value) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.value))
    } else {
      pairs.push(encodeURIComponent(key))
    }
  }

  var location = 'https://trombonepiano.com' + request.uri
  if (pairs.length) location += '?' + pairs.join('&')
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  }
}
