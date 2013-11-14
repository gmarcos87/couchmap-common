var _ = require('underscore');

module.exports._ = _;

/* for lon2tile and lat2tile: see
   http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
*/
var lon2tile = module.exports.lon2tile = function(lon, zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
};

var lat2tile = module.exports.lat2tile = function(lat, zoom) {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
};

// returns NW-corner of tile
var tile2lon = module.exports.tile2lon = function(x,z) {
  return (x/Math.pow(2,z)*360-180);
};

var tile2lat = module.exports.tile2lat = function(y,z) {
  var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
};

module.exports.coarse_min_zoom = 0;
module.exports.coarse_max_zoom = 18;

module.exports.validate_zoom = function(zoom) {
  var min = module.exports.coarse_min_zoom;
  var max = module.exports.coarse_max_zoom;
  if (zoom<min) {
    return min;
  }
  if (zoom>max) {
    return max;
  }
  return zoom;
};

/* generates coarse keys */
module.exports.coarse_map_keys = function(lat, lon) {
  var keys = [];
  if (-85.0511<=lat && lat<=85.0511 && -180<=lon && lon<=180) {
    for (var zoom=module.exports.coarse_min_zoom;
        zoom<=module.exports.coarse_max_zoom; zoom++) {
      keys.push([
          zoom,
          lon2tile(lon, zoom),
          lat2tile(lat, zoom)
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
    lon: lon,
    bbox_west: _.min(_.pluck(values, 'bbox_west')),
    bbox_east: _.max(_.pluck(values, 'bbox_east')),
    bbox_south: _.min(_.pluck(values, 'bbox_south')),
    bbox_north: _.max(_.pluck(values, 'bbox_north')),
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
  this.toTiles = function(zoom) {
    var c_lat = (bbox[0]+bbox[2]) / 2,
        c_lon = (bbox[1]+bbox[3]) / 2,
        x = lon2tile(c_lon, zoom),
        y = lat2tile(c_lat, zoom);

    for (var xmin=x; this.contains(c_lat, tile2lon(xmin, zoom)); xmin--){}
    for (var xmax=x+1; this.contains(c_lat, tile2lon(xmax, zoom)); xmax++){}
    for (var ymin=y; this.contains(tile2lat(ymin, zoom), c_lon); ymin--){}
    for (var ymax=y+1; this.contains(tile2lat(ymax, zoom), c_lon); ymax++){}

    tiles = [];
    for (y=ymin; y<ymax; y++) {
      for (x=xmin; x<xmax; x++) {
        tiles.push([zoom,x,y]);
      }
    }
    return tiles;
  };
  return this;
};

/* filter_id_or_bbox
*/
module.exports.filter_id_or_bbox = function(doc, req) {
  var parameters = JSON.parse(req.body);

  // sanitize input
  if (!_.isArray(parameters.ids)) {
    parameters.ids = [];
  }
  var bbox = module.exports.bbox(parameters.bbox);

  if (parameters.ids.indexOf(doc._id)>=0 ||
      bbox && bbox.contains(doc.lat, doc.lon)) {
    return true;
  }
};
