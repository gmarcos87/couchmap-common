var _ = require('underscore');

module.exports._ = _;

/* for lon2tile and lat2tile: see
   http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
*/
module.exports.lon2tile = function(lon, zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
};

module.exports.lat2tile = function(lat, zoom) {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
};

/* generates coarse keys */
module.exports.coarse_map_keys = function(lat, lon) {
  var keys = [];
  if (-85.0511<=lat && lat<=85.0511 && -180<=lon && lon<=180) {
    for (var zoom=0; zoom<=18; zoom++) {
      keys.push([
          zoom,
          module.exports.lon2tile(lon, zoom),
          module.exports.lat2tile(lat, zoom)
        ]);
    }
  }
  return keys;
};

/* reduce function for coarsening

   returns an object of the form
   {
     count: 1337,
     lat: 51.2,
     lon: 13.5
    }
    where lat/lon are the arithmetic means of all lats/lons
*/
module.exports.coarse_reduce = function(keys, values, rereduce) {
  var sum = function(arr, key) {
    return _.reduce(_.pluck(arr, key), function(s, a) {return s+a;});
  };
  var count = 0;
  var lat = 0;
  var lon = 0;
  _.each(values, function(v) {
    count += v.count;
    lat += v.lat*v.count;
    lon += v.lon*v.count;
  });
  if (count>0) {
    lat /= count;
    lon /= count;
  }
  return {
    count: count,
    lat: lat,
    lon: lon
  };
};

/* this function returns a Bbox object with converter methods.

   unfortunately, there are several types of bounding boxes out there
   (lat1,lon1 is south-west; lat2,lon2 is north-east):
   string (e.g. in url):    lat1,lon1,lat2,lon2
   leaflet (LatLngBounds):  [[lat1,lon1], [lat2,lon2]]
   geocouch (spatial view): [lon1, lat1, lon2, lat2]

   the constructor takes any of the above bbox formats
*/
module.exports.bbox = function(bbox_in) {
  // store bbox in array of form [lat1,lon1,lat2,lon2] internally
  var bbox = [];
  if (_.isString(bbox_in)) {
    // string incoming
    bbox = _.map(bbox_in.split(','), parseFloat);
  } else if (_.isArray(bbox_in)) {
    if (bbox_in.length == 2) {
      // leaflet incoming
      bbox = _.flatten(bbox_in);
    } else if (bbox_in.length == 4) {
      // geocouch incoming
      bbox = [bbox_in[1],bbox_in[0],bbox_in[3],bbox_in[2]];
    }
  }
  // check if bbox is valid
  if (bbox.length!=4 || !_.every(bbox, _.isNumber) || _.some(bbox, _.isNaN) ||
        bbox[0]>bbox[2] || bbox[1]>bbox[3]) {
    return undefined;
  }

  this.toString = function() {
    return bbox.toString();
  };
  this.toLeaflet = function() {
    return [[bbox[0],bbox[1]], [bbox[2],bbox[3]]];
  };
  this.toGeocouch = function() {
    return [bbox[1],bbox[0],bbox[3],bbox[2]];
  };
  this.contains = function(lat, lon) {
    return bbox[0]<=lat && lat<=bbox[2] && bbox[1]<=lon && lon<=bbox[3];
  };
  return this;
};
