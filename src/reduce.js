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
  var ret = {
    count: 0,
    lat: 0,
    lon: 0,
    bbox_west: Infinity,
    bbox_east: -Infinity,
    bbox_south: Infinity,
    bbox_north: -Infinity
  };
  for (var i=0, v; (v=values[i++]);) {
    ret.count += v.count;
    ret.lat += v.lat*v.count;
    ret.lon += v.lon*v.count;
    ret.bbox_west = Math.min(ret.bbox_west, v.bbox_west);
    ret.bbox_east = Math.max(ret.bbox_east, v.bbox_east);
    ret.bbox_south = Math.min(ret.bbox_south, v.bbox_south);
    ret.bbox_north = Math.max(ret.bbox_north, v.bbox_north);
  }
  if (ret.count>0) {
    ret.lat /= ret.count;
    ret.lon /= ret.count;
  }
  return ret;
}
