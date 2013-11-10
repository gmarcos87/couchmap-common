function(keys, values, rereduce) {
  /* unfortunately, couchdb does not allow require() in reduce
   * functions. once this is allowed, the following 2 lines should do
   * the trick.
  var common = require('views/lib/couchmap-common');
  return common.coarse_reduce(keys, values, rereduce);
  */

  // what follows is a copy-paste of couchmap-common.coarse_rereduce
  // (without underscore)
  // this file can be symlinked into your view dir
  var sum = function(arr, key) {
    var val = 0;
    for (var i=0, el; (el=arr[i++]);) {
      val += el[key];
    }
    return val;
  };
  var count = 0;
  var lat = 0;
  var lon = 0;
  for (var i=0, v; (v=values[i++]);) {
    count += v.count;
    lat += v.lat*v.count;
    lon += v.lon*v.count;
  }
  if (count>0) {
    lat /= count;
    lon /= count;
  }
  return {
    count: count,
    lat: lat,
    lon: lon
  };

}
